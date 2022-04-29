import { is } from 'unist-util-is'
import { visitParents as visit } from 'unist-util-visit-parents'

const unwrapFragments = tree => {
  const isFragment = node => is(node, 'root') && node !== tree

  visit(tree, isFragment, (node, ancestors) => {
    const parent = ancestors[ancestors.length - 1]
    const index = parent.children.indexOf(node)
    parent.children.splice(index, 1, ...node.children)
    return index + node.children.length
  })
}

export default unwrapFragments
