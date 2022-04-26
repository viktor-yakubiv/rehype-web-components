import { toVFile, read } from 'to-vfile'
import { unified } from 'unified'
import parser from 'rehype-parse'
import Component from './component.js'
import Template from './template.js'
import Script from './script.js'
import Style from './style.js'

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

const parse = parsable => {
  const componentTree = unified()
    .use(parser, { fragment: true })
    .parse(parsable)

  return split(componentTree.children)
}

const load = async (fileLike) => {
  const file = await read(fileLike)
  const result = parse(file)
  return {
    ...result,
    file,
  }
}

class DeclarativeComponent extends Component {
  constructor(options) {
    super(options)
    this.file = toVFile(options)
  }

  async load() {
    if (this.file.value != null) return

    const result = await load(this.file)
    const { setupScript, templateNodes, styleNodes } = result

    this.file = result.file
    this.setupScript = setupScript != null ? new Script(setupScript) : null
    this.template = new Template(templateNodes)
    this.styles = styleNodes.map(node => new Style(node, {
      sourcePath: this.file.history[this.file.history.length - 1],
    }))
  }

  async setup(hostTree) {
    if (this.setupScript == null) return hostTree

    const preparedTree = await this.setupScript.run(hostTree)
    return preparedTree ?? hostTree
  }

  async transform(hostTree) {
    const shadowTree = await this.template.render(hostTree)
    return shadowTree ?? hostTree
  }

  async style(shadowTree) {
    let styledTree = shadowTree
    for (const style of this.styles) {
      styledTree = await style.apply(styledTree) ?? styledTree
    }
    return styledTree
  }

  async render(hostTree, ancestors) {
    await this.load()

    const preparedTree = await this.setup(hostTree)
    const shadowTree = await this.transform(preparedTree)
    const styledTree = await this.style(shadowTree)

    const styleNodes = this.styles.map(s => s.resultNode)
    const shadowNodes = styledTree.children

    return [...styleNodes, ...shadowNodes]
  }
}

export default DeclarativeComponent
