import * as fs from 'fs-extra'
import { load, finds } from 'load-cfg'
import chokidar from 'chokidar'
import get from 'lodash/get'

import * as paths from '../config/paths'
import { Params, State } from '../lib/DataServer'
import { Config, Menu, ThemeConfig } from '../config/argv'
import { getRepoUrl } from '../utils/repo-info'

interface Payload {
  title: string
  description: string
  menu: Menu[]
  version: string | null
  repository: string | null
  native: boolean
  codeSandbox: boolean
  themeConfig: ThemeConfig
  separator: string
}

const getInitialConfig = (config: Config): Payload => {
  const pkg = fs.readJsonSync(paths.appPackageJson, { throws: false })
  const repoUrl = getRepoUrl()

  return {
    title: config.title,
    description: config.description,
    menu: config.menu,
    version: get(pkg, 'version'),
    repository: repoUrl,
    native: config.native,
    codeSandbox: config.codeSandbox,
    themeConfig: config.themeConfig,
    separator: config.separator,
  }
}

const updateConfig = (config: Config) => async (p: Params) => {
  const initial = getInitialConfig(config)
  const next = load('docz', initial, true, true)
  p.setState('config', next)
}

export const state = (config: Config): State => {
  const watcher = chokidar.watch(finds('docz'), {
    cwd: paths.root,
    ignored: /(((^|[\/\\])\..+)|(node_modules))/,
    persistent: true,
  })

  watcher.setMaxListeners(Infinity)

  return {
    id: 'config',
    start: async params => {
      const update = updateConfig(config)
      const fn = async () => update(params)

      await update(params)
      watcher.on('add', fn)
      watcher.on('change', fn)
      watcher.on('unlink', fn)
    },
    close: () => {
      watcher.close()
    },
  }
}