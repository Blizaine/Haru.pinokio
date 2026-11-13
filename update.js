module.exports = {
  run: [{
    when: "{{exists('.git/refs/remotes/origin') || exists('.git/packed-refs')}}",
    method: "shell.run",
    params: {
      message: { _: ["{{which('git')}}", "pull", "--ff-only"] }
    }
  }, {
    when: "{{exists('app/.git')}}",
    method: "shell.run",
    params: {
      path: "app",
      message: { _: ["{{which('git')}}", "pull", "--ff-only"] }
    }
  }, {
    method: "script.start",
    params: {
      uri: "install.js"
    }
  }]
}
