module.exports = {
  requires: {
    bundle: "ai"
  },
  run: [{
    when: "{{!exists('app')}}",
    method: "shell.run",
    params: {
      message: {
        _: ["{{which('git')}}", "clone", "https://github.com/Blizaine/Haru", "app"]
      }
    }
  }, {
    when: "{{exists('app/.installed')}}",
    method: "fs.rm",
    params: {
      path: "app/.installed"
    }
  }, {
    when: "{{platform === 'darwin'}}",
    method: "shell.run",
    params: {
      path: "app",
      venv: "env",
      message: [
        "python -c \"import platform; assert platform.machine() == 'arm64', 'Haru on macOS requires Apple silicon'\"",
        { _: ["{{which('uv')}}", "pip", "install", "-e", "./haru", "-e", "./haru_mlx"] },
        "python -c \"import haru.server, haru_mlx.backends; import mlx.core as mx; assert mx.metal.is_available(), 'Haru requires an Apple silicon GPU'\""
      ],
      on: [{
        event: "/error:|traceback|no solution found|command not found/i",
        break: true
      }]
    }
  }, {
    when: "{{platform !== 'darwin'}}",
    method: "shell.run",
    params: {
      path: "app",
      venv: "env",
      message: [
        { _: ["{{which('uv')}}", "pip", "install", "-e", "./haru", "--torch-backend", "auto"] },
        "python -c \"import torch, haru.server; assert torch.cuda.is_available(), 'Haru requires an NVIDIA CUDA GPU and a compatible driver'\""
      ],
      on: [{
        event: "/error:|traceback|no solution found|command not found/i",
        break: true
      }]
    }
  }, {
    method: "fs.write",
    params: {
      path: "app/.installed",
      text: "Installation complete\n"
    }
  }, {
    method: "notify",
    params: {
      html: "Haru is installed. Click Start. The first launch downloads the model (about 10 GB)."
    }
  }]
}
