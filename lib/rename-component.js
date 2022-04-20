const rename = (component, newName) => {
  Object.defineProperty(component, 'name', {
    ...Object.getOwnPropertyDescriptor(component, 'name'),
    value: newName,
  })
}

export default rename
