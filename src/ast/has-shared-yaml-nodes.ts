import * as yaml from "yaml";

export function hasSharedYamlNodes(root: yaml.YAMLMap): boolean {
  let shared = false;
  yaml.visit(root, {
    Node: (_key, node) => {
      if (yaml.isAlias(node) || ("anchor" in node && node.anchor))
        shared = true;
    },
  });
  return shared;
}
