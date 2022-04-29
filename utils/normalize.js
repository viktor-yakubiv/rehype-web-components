import { visitParents as visit } from 'unist-util-visit-parents'

const normalize = tree => visit(tree, 'text', (node, ancestors) => {
  const parent = ancestors[ancestors.length - 1]
  const index = parent.children.indexOf(node)

  if (index === 0) {
    return
  }

  const previous = parent.children[index - 1]
  if (node.type === previous.type) {
    previous.value += node.value
    parent.children.splice(index, 1)
    return index
  }
})

export default normalize
