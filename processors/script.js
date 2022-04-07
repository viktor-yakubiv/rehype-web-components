const createModule = contents => {
  const url = `data:text/javascript,${encodeURIComponent(contents)}`
  return import(url)
}

const createFunction = contents =>
  // Interface is a subject of change
  new Function('properties', 'children', contents)

class Script {
  constructor(node) {
    this.contents = node.children[0].value
    this.type = node.properties?.type
  }

  async run(tree) {
    if (!Object.hasOwn(this, 'executor')) {
      this.executor = this.type === 'module'
        ? (await createModule(this.contents)).default
        : createFunction(this.contents)
    }

    if (this.executor == null) {
      throw new Error('You are likely to use <script type="module"> but forgot to export default')
    }

    return this.executor.call(tree, tree.properties, tree.children)
  }
}

export default Script
