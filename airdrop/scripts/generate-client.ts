import { createFromRoot } from 'codama';
import { rootNodeFromAnchor, type AnchorIdl } from '@codama/nodes-from-anchor';
import { renderVisitor as renderJavaScriptVisitor } from "@codama/renderers-js";
import anchorIdl from '../programs/Turbin3_prereq.json';
import path from 'path';

// Generate JavaScript client from the Anchor IDL into clients/js/src/generated
const codama = createFromRoot(rootNodeFromAnchor(anchorIdl as AnchorIdl));
const jsClient = path.join(process.cwd(), "clients", "js");
codama.accept(renderJavaScriptVisitor(path.join(jsClient, "src", "generated")));

console.log(`Generated client at ${path.join(jsClient, 'src', 'generated')}`);