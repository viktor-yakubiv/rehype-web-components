import castArray from 'lodash.castarray'
import { is } from 'unist-util-is'
import { visitParents as visit, SKIP } from 'unist-util-visit-parents'
import { isElement } from 'hast-util-is-element'
import indexComponents from './lib/index-components.js'

const unwrap = node => castArray(is(node, 'root') ? node.children : node)
const wrap = thing => is(thing, 'root')
  ? thing
  : { type: 'root', children: castArray(thing) }

const attach = ({
  fragments: keepFragments = true,
  ...indexerOptions
} = {}) => async (tree, file) => {
  const componentsIndex = await indexComponents(indexerOptions)

  const isRegisteredComponent = node => isElement(node) &&
    componentsIndex.has(node.tagName)

  const transform = async (subtree, subtreeParent) => {
    const asyncUpdates = []

    visit(subtree, isRegisteredComponent, (node, ancestors) => {
      const parent = ancestors[ancestors.length - 1] ?? subtreeParent
      const component = componentsIndex.get(node.tagName)

      const update = component.call(null, node, file)

        // a component could modify the tree in place and return nothing
        // or could return a fragment 'root' node or a regular one
        .then(result => {
          const nextSubtree = wrap(result == null ? node : result)
          return transform(nextSubtree, parent)
        })

        // for some reason `transform()` does not return tree 🤔
        .then(result => {
          const transformedSubtree = unwrap(result == null ? node : result)
          const nodeList = castArray(transformedSubtree)

          // the index must be searched just before replacing
          // because of unpredictable asynchronous list shifts
          const index = parent.children.indexOf(node)
          parent.children.splice(index, 1, ...nodeList)

          return nodeList
        })

      asyncUpdates.push(update)
      return SKIP
    })

    await Promise.all(asyncUpdates)
    return subtree
  }

  await transform(tree)
}

export default attach
