'use strict'

const Version = {
  async getVersion(){
    const manifest = chrome.extension.getURL('manifest.json')
    const e = await fetch(manifest)
    const t = await e.text()

    const o = JSON.parse(t)

    return o.version_name
  },
}
