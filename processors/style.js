import clone from 'lodash.clonedeep'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

const hasClassName = node => node.properties?.className != null

const applyModule = cssModule => tree => visit(tree, hasClassName, node => {
  node.properties.className = node.properties.className
    .map(name => cssModule[name] ?? name)
})

class Style {
  constructor(node, { sourcePath } = {}) {
    this.sourceNode = node
    this.sourcePath = sourcePath
    this.options = {
      scopeBehaviour:
        // Despite it's deprecated, it's handy here
        Object.hasOwn(node.properties ?? {}, 'scoped') ? 'local' : 'global',
    }
  }

  get source() {
    return this.sourceNode.children?.[0]?.value
  }

  get result() {
    return this.resultNode?.children?.[0]?.value
  }

  async compile() {
    if (typeof this.source != 'string') {
      this.module = {}
      this.resultNode = clone(this.sourceNode)
      delete this.resultNode.properties.scoped
      return
    }

    const cssModulesPlugin = postcssModules({
      ...this.options,
      getJSON: () => {},
    })

    const cssProcessor = postcss([cssModulesPlugin])
    const result = await cssProcessor
      .process(this.source, { from: this.sourcePath })

    this.resultNode = clone(this.sourceNode)
    this.resultNode.children[0].value = result.css
    delete this.resultNode.properties.scoped

    const cssModule = result.messages
      .find(({ type, plugin }) => type === 'export' &&
        plugin === 'postcss-modules')?.exportTokens ?? {}
    this.module = cssModule

    // For some reason components receive undefined processing result
    // despite it's awaited. No undefined result could be logged from this
    // method though.
    //
    // I've got tired from debugging this; 100ms wait works
    return new Promise(resolve => setTimeout(resolve, 100))
  }

  attach(tree) {
    if (tree.children.includes(this.resultNode)) return;
    tree.children.push(this.resultNode)
  }

  async apply(shadowTree) {
    if (this.module == null) await this.compile()

    return unified()
      .use(applyModule, this.module)
      .run(shadowTree)
  }
}

export default Style
