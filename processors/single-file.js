import { promises as fs } from 'fs'
import path from 'path'
import clone from 'lodash.clonedeep'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import parser from 'rehype-parse'
import formatter from 'rehype-format'
import stringifier from 'rehype-stringify'
import Template from './template.js'
import Script from './script.js'

const split = nodeList => {
  const sortedNodes = [[], [], []]

  nodeList.forEach(node => {
    const listIndex = (['script', 'style'].indexOf(node.tagName) + 3) % 3
    const targetList = sortedNodes[listIndex]
    targetList.push(node)
  })

  const [scriptNodes, styleNodes, templateNodes] = sortedNodes

  // TODO: Subject of discussion
  // It's supposed to be a custom hook before template substitution
  // but this is different from what Vue or Svelte does
  const setupScript = scriptNodes
    .reverse()
    .find(({ properties }) => properties.setup != null)

  return {
    setupScript,
    scriptNodes,
    styleNodes,
    templateNodes,
  }
}

const parse = text => {
  const componentTree = unified()
    .use(parser, { fragment: true })
    .parse(text)

  return split(componentTree.children)
}

const load = async (filePath) => {
  const fileContents = await fs.readFile(filePath)
  const { setupScript, templateNodes } = parse(fileContents)

  const template = new Template(templateNodes)
  const setup = new Script(setupScript)

  const component = async (hostTree, index, parent) => {
    const preparedTree = await setup.run(hostTree)
    console.log(hostTree.properties)
    const shadowTree = await template.render(preparedTree ?? hostTree)
    return shadowTree.children
  }

  return component
}

export default load
