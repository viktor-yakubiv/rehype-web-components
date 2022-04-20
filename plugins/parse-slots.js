import { visitParents as visit } from 'unist-util-visit-parents'
import { is } from 'unist-util-is'
import { hasProperty } from 'hast-util-has-property'
import { isElement } from 'hast-util-is-element'

// According to the DOM specification,
// a default (missing) name is an empty string
//
// See more: https://dom.spec.whatwg.org/#slot-name
const defaultSlotName = ''

const hasSlotRefs = node => (node?.children ?? [])
  .some(child => hasProperty(child, 'slot'))

const collectSlots = nodeList => {
  const slotMap = nodeList.reduce((slots, node) => {
    const name = node.properties?.slot ?? defaultSlotName

    if (!slots.has(name)) slots.set(name, [])

    slots.get(name).push(node)

    return slots
  }, new Map())

  return Object.fromEntries(slotMap.entries())
}

const extractSlotsData = node => {
  const slots = collectSlots(node.children ?? [])
  node.data = Object.assign(node.data ?? {}, { slots })
}

const attach = ({
  shallow = false,
  ignoreRoot = false,
  test = hasSlotRefs,
} = {}) => {
  const transform = tree => {
    if (shallow) {
      const node = ignoreRoot &&
        is(tree, 'root') &&
        isElement(tree.children[0]) &&
        (tree.children.length === 1)
        ? tree.children[0]
        : tree

      extractSlotsData(node)
    } else {
      visit(tree, test, extractSlotsData)
    }
  }

  return transform
}

export default attach
export { defaultSlotName }
