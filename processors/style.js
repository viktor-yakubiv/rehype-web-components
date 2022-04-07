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
  constructor(node) {
    this.sourceNode = node
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

  compile() {
    if (typeof this.source != 'string') {
      this.module = {}
      this.resultNode = clone(this.sourceNode)
      delete this.resultNode.properties.scoped
      return
    }

    const cssModulesPlugin = postcssModules({
      ...this.options,
      getJSON: (_, cssModule) => {
        this.module = cssModule
      },
    })

    return postcss([cssModulesPlugin])
      // TODO: Find a way to provide `from` and `to` options
      .process(this.source)
      .then(({ css }) => {
        this.resultNode = clone(this.sourceNode)
        this.resultNode.children[0].value = css
        delete this.resultNode.properties.scoped
      })
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
