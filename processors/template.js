import clone from 'lodash.clonedeep'
import substituteValues from 'rehype-lodash-template'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

const DEFAULT_SLOT = ''

const trim = nodeList => {
  const test = ({ type, value }) => type === 'element' || !/^\s*$/gi.test(value)
  const start = nodeList.findIndex(test)
  // findIndexLast is missing
  const end = (nodeList.length - 1) - [...nodeList].reverse().findIndex(test)
  return nodeList.slice(start, end + 1)
}

/**
 * Slots
 */

const isSlot = node => node.tagName === 'slot'

const collectSlots = hostTree =>
  (hostTree.children ?? []).reduce((slots, child) => {
    const name = child.properties?.slot ?? DEFAULT_SLOT
    if (!slots.has(name)) slots.set(name, [])
    slots.get(name).push(child)
    return slots
  }, new Map())

const substituteSlots = slots => shadowTree =>
  visit(shadowTree, isSlot, (slotNode, index, parent) => {
    const name = slotNode.properties?.name ?? DEFAULT_SLOT
    const replacement = slots.get(name) ?? slotNode.children ?? []
    parent.children.splice(index, 1, ...replacement)
  })

/**
 * Values
 */

const valueTest = /\{(?<name>\w+)\}/

const hasValue = node => {
  const text = [
    ...Object.values(node.properties ?? {}),
    node.value || '',
  ].join('\n')

  return valueTest.test(text)
}

/**
 * Properties pass
 */

const passProperties = properties => tree => {
  if (tree.children.length !== 1) return tree
  if (tree.children[0].type != 'element') return tree

  const templateRoot = tree.children[0]

  const hostClassName = properties?.className ?? []
  const templateClassName = templateRoot.properties?.className ?? []
  const className = [
    ...templateClassName,
    ...hostClassName,
  ]

  if (className.length > 0) {
    templateRoot.properties.className = className
  }

  const hostStyle = properties?.style ?? ''
  const templateStyle = templateRoot.properties?.style ?? ''
  const [conjunction] = templateStyle.match(/;\s*$/g) ?? ['; ']
  const style = [
    templateStyle.replace(/;\s*$/, ''),
    hostStyle,
  ].filter(Boolean).join(conjunction)

  if (style) {
    templateRoot.properties.style = style
  }
}

/**
 * API class
 */

const appendPosition = position => tree => Object.assign(tree, { position })

class Template {
  constructor(nodes) {
    this.tree = {
      type: 'root',
      tagName: 'template',
      children: trim(nodes),
    }
  }

  render(hostTree) {
    const shadowTree = clone(this.tree)
    const slots = collectSlots(hostTree)
    const properties = hostTree.properties ?? {}

    return unified()
      .use(substituteSlots, slots)
      .use(substituteValues, { values: properties })
      .use(passProperties, properties)
      .use(appendPosition, hostTree.position)
      .run(shadowTree)
  }
}

export default Template
