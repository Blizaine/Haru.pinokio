module.exports = {
  daemon: true,
  run: [{
    method: "shell.run",
    params: {
      path: "{{platform === 'darwin' ? 'app' : 'app/haru'}}",
      venv: "{{platform === 'darwin' ? 'env' : '../env'}}",
      env: {
        PYTHONUNBUFFERED: "1"
      },
      message: "python {{platform === 'darwin' ? '../mlx-web.py' : '-m haru.server'}} --host 127.0.0.1 --port {{port}}",
      on: [{
        event: "/(http:\\/\\/[0-9.:]+)/",
        done: true
      }, {
        event: "/traceback|error:|command not found|the model could not be loaded/i",
        break: true
      }]
    }
  }, {
    when: "{{input.event && input.event[1]}}",
    method: "local.set",
    params: {
      url: "{{input.event[1]}}"
    }
  }]
}
