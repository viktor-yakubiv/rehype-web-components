const defaultGlobalsEjector = node => [node.properties, node.children]

const attach = ({
  globals: ejectGlobals = defaultGlobalsEjector,
} = {}) => async tree => {
  const globals = ejectGlobals(tree)
  const setup = tree.data?.scripts?.setup
  await setup?.apply(tree, globals)
}

export default attach
