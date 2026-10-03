export function buildNavItems({ order, folderDefs, isVisible, folderVisibleOn, build, folderIcon }) {
  const folderById = new Map(folderDefs.map(f => [f.id, f]))
  const folderOf = new Map(folderDefs.flatMap(f => (f.children ?? []).map(id => [id, f.id])))
  const isTab = id => !folderById.has(id) && isVisible(id)
  const isAbsorbedByVisibleFolder = id => {
    const fid = folderOf.get(id)
    return fid !== undefined && folderById.has(fid) && folderVisibleOn(fid)
  }

  const folders = folderDefs.filter(f => folderVisibleOn(f.id)).map(f => {
    const childrenSet = new Set(f.children ?? [])
    const orderedChildren = order.filter(id => childrenSet.has(id))
    const remainingChildren = (f.children ?? []).filter(id => !order.includes(id))
    return {
      id: f.id,
      label: f.label,
      iconKey: f.icon ?? 'folder',
      icon: folderIcon(f.icon),
      isFolder: true,
      items: [...orderedChildren, ...remainingChildren].filter(isTab).map(build),
    }
  }).filter(f => f.items.length > 0)

  const renderedFolders = new Map(folders.map(f => [f.id, f]))
  const items = []
  for (const id of order) {
    if (renderedFolders.has(id)) items.push(renderedFolders.get(id))
    else if (isTab(id) && !isAbsorbedByVisibleFolder(id)) items.push(build(id))
  }
  for (const f of folders) if (!order.includes(f.id)) items.push(f)

  const primary = order.filter(isTab).filter(id => !isAbsorbedByVisibleFolder(id)).map(build)
  return { items, primary, folders }
}
