import { isJavaScript } from 'hast-util-is-javascript'
import { hasProperty } from 'hast-util-has-property'
import { toText } from 'hast-util-to-text'

const isSetupScript = node =>
  isJavaScript(node) && hasProperty(node, 'setup')

const trim = nodeList => {
  const test = ({ type, value }) => type === 'element' || !/^\s*$/gi.test(value)
  const start = nodeList.findIndex(test)
  // findIndexLast is missing
  const end = (nodeList.length - 1) - [...nodeList].reverse().findIndex(test)
  return nodeList.slice(start, end + 1)
}

const attach = ({
  globals = ['properties', 'children'],
  remove: shouldRemove = false,
  trim: shouldTrim = false,
} = {}) => tree => {
  const scriptNodes = tree.children.filter(node => isSetupScript(node))

  if (scriptNodes.length === 0) return

  const children = shouldRemove
    ? tree.children.filter(node => !scriptNodes.includes(node))
    : tree.children

  const setupScriptNode = scriptNodes[scriptNodes.length - 1]
  const setupScriptCode = toText(setupScriptNode, { whitespace: 'pre' })
  const setupFunction = new Function(...globals, setupScriptCode)

  const scripts = Object.assign(tree.data?.scripts ?? {}, {
    setup: setupFunction,
  })

  tree.children = shouldTrim ? trim(children) : children
  tree.data = Object.assign(tree.data ?? {}, { scripts })
}

export default attach
