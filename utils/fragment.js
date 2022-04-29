const fragment = (nodeOrChildren, childrenOrNothing) => {
  const node = Array.isArray(nodeOrChildren) ? {} : { ...nodeOrChildren }
  const fragmentNode = Object.assign(node, { type: 'root' })
  const children = Array.isArray(nodeOrChildren)
    ? nodeOrChildren
    : childrenOrNothing ?? node.children ?? []

  fragmentNode.children = children
  return fragmentNode
}

export default fragment
