/**
 * Pure selection logic for the file manager's batch-delete button.
 *
 * Given the tree items selected in `FileBrowser`, return the subset that
 * actually needs a delete command. If a folder/channel and one of its children
 * are both selected, only the parent is sent (the ServerQuery removes the whole
 * subtree when a folder / the contents of a channel are deleted), so the child
 * is dropped. `selectedFiles` items are full node objects.
 *
 * @param {Array<Object>} selectedFiles - selected tree nodes (objects)
 * @returns {Array<Object>} - the nodes a delete command should target
 */
export function getRemoveList(selectedFiles) {
  const removeList = [...selectedFiles];

  selectedFiles.forEach((file, index) => {
    const parentFile = selectedFiles.find(
      (selectedFile) => file.pid === selectedFile.id
    );

    if (parentFile) {
      delete removeList[index];
    }
  });

  // reindex array
  return removeList.filter((file) => file);
}
