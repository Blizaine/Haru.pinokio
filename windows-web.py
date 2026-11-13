"""Start Haru without allocating a second model's weights in Windows RAM."""

from contextlib import contextmanager

import torch
from haru.models import loaders
from haru.server import main

_no_init_weights = loaders.no_init_weights


@contextmanager
def empty_parameters():
    register_parameter = torch.nn.Module.register_parameter

    def register_meta(module, name, parameter):
        register_parameter(module, name, parameter)
        parameter = module._parameters[name]
        if parameter is not None:
            replacement = torch.nn.Parameter(parameter.to("meta"), requires_grad=parameter.requires_grad)
            replacement.__dict__.update(parameter.__dict__)
            module._parameters[name] = replacement

    try:
        with _no_init_weights():
            torch.nn.Module.register_parameter = register_meta
            yield
    finally:
        torch.nn.Module.register_parameter = register_parameter


if __name__ == "__main__":
    # Buffers remain real tensors; load_state_dict(assign=True) supplies the
    # checkpoint's real parameters before the upstream loader moves the model.
    loaders.no_init_weights = empty_parameters
    main()
