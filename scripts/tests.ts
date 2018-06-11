declare const riot;
import {treeFromJson} from './select-tree';
treeFromJson('test/test.json').then(function(tree){ 
    window['tree'] = tree;
    console.log(window['tree'])
    riot.compile(function() {
        window['tags'] = riot.mount('select-tree-example')
    })
})
    
