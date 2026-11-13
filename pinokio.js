module.exports = {
  version: "8.0.0",
  title: "Haru",
  icon: "icon.png",
  description: "Haru-4B voice conversations in your browser. Apple silicon Mac or NVIDIA CUDA on Windows/Linux. See README for GPU and system memory requirements.",
  menu: async (kernel, info) => {
    let installed = info.exists("app/.installed")
    let running = {
      install: info.running("install.js"),
      start: info.running("start.js"),
      update: info.running("update.js"),
      reset: info.running("reset.js")
    }
    if (running.install) {
      return [{ default: true, icon: "fa-solid fa-plug", text: "Installing", href: "install.js" }]
    } else if (running.update) {
      return [{ default: true, icon: "fa-solid fa-terminal", text: "Updating", href: "update.js" }]
    } else if (running.reset) {
      return [{ default: true, icon: "fa-solid fa-terminal", text: "Resetting", href: "reset.js" }]
    } else if (running.start) {
      let local = info.local("start.js")
      if (local && local.url) {
        return [{
          default: true,
          icon: "fa-solid fa-rocket",
          text: "Open Web UI",
          href: local.url
        }, {
          icon: "fa-solid fa-terminal",
          text: "Terminal",
          href: "start.js"
        }]
      }
      return [{ default: true, icon: "fa-solid fa-terminal", text: "Running", href: "start.js" }]
    } else if (installed) {
      return [{
        default: true,
        icon: "fa-solid fa-power-off",
        text: "Start",
        href: "start.js"
      }, {
        icon: "fa-solid fa-rotate",
        text: "Update",
        href: "update.js"
      }, {
        icon: "fa-solid fa-plug",
        text: "Reinstall",
        href: "install.js"
      }, {
        icon: "fa-solid fa-broom",
        text: "Reset",
        href: "reset.js",
        confirm: "Quit Haru and stop Start first. Reset deletes app/, including its environments and any files you saved there. Continue?"
      }]
    }
    return [{ default: true, icon: "fa-solid fa-plug", text: "Install", href: "install.js" }]
  }
}
