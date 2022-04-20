import { read } from 'to-vfile'
import { unified } from 'unified'
import parser from 'rehype-parse'
import cssModules from 'rehype-css-modules'

import rename from '../lib/rename-component.js'
import resolveName from '../lib/resolve-name.js'
import templateInjector from '../plugins/inject-template.js'
import scriptParser from '../plugins/parse-scripts.js'
import scriptRunner from '../plugins/run-scripts.js'
import slotSubstituor from '../plugins/replace-slots.js'
import slotParser from '../plugins/parse-slots.js'
import valueSubstitutor from '../plugins/substitute.js'

const prepare = file => {
  const processor = unified()
    .use(parser, { fragment: true })
    .use(scriptParser, { remove: true, trim: true })

  return processor.run(processor.parse(file), file)
}

const create = (name, templateTree, templateFile) => {
  const component = function component(hostTree, hostFile) {
    return unified()
      .use(slotParser, { shallow: true })
      .use(templateInjector, {
        tree: templateTree,
        file: templateFile,
        clone: true,
      })
      .use(scriptRunner)
      .use(slotSubstituor, { context: 'root' })
      .use(valueSubstitutor, { values: hostTree.properties })
      .use(cssModules)
      .run(hostTree, hostFile)
  }

  rename(component, name)

  return component
}

const createLazy = (filePath, options = {}) => {
  const nameOptions = Object.assign({ ext: /\.html$/i }, options)
  const name = resolveName(filePath, nameOptions)
  let component

  const lazyComponent = async function lazyComponent(...args) {
    if (component == null) {
      const templateFile = await read(filePath)
      const templateTree = await prepare(templateFile)
      component = create(name, templateTree, templateFile)
    }

    return component.apply(this, args)
  }

  rename(lazyComponent, name)

  return lazyComponent
}

export default createLazy
