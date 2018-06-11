import * as $ from "jquery";

enum TreeLoadingState {
    unknown = 0,
    loading = 1,
    done = 2,
    error = -1
}

export class Tree {
    nodes: TreeNode[]
    state: TreeStates;

    constructor() {
        this.nodes = [];
        this.state = new TreeStates();
    }

    showAll = () => {
        for (let node of this.unSelectedNodes()){
            node.toggleState('visible', true)
        }
    }

    showSelected = () => {
        /* Show selected nodes and parent nodes only; hide unselected nodes */
        const unselect = this.unSelectedNodes();
        const select = this.selectedNodes();
        for (let node of unselect){
            if(node.parentId){
                node.toggleState('visible',false)
            }
        }
        for (let node of select){
            let p : TreeNode | void = node;
            while (p){
                p.toggleState('visible', true);
                p.toggleState('expanded', true);
                p = p.parent();
            }
        }
    }
    
    createNode(id, level, parentId, label): TreeNode {
        let tree = this;
        let node = new TreeNode(id, level, parentId, label, this);
        this.nodes.push(node);
        return node;
    }

    private selectedNodes(): TreeNode[]{
        return this.nodes.filter(function(n: TreeNode): boolean { return n.state.selected })
    }

    private unSelectedNodes(): TreeNode[]{
        return this.nodes.filter(function(n: TreeNode): boolean { return !n.state.selected })
    }

    setLoadingState(state:TreeLoadingState) : TreeLoadingState {
        this.state.loading = state;
        return this.state.loading;
    }

    searchNodes(term:string): TreeNode[]{
        // Set 'visible' on nodes where 'name' matches search term
        var nodes: TreeNode[] = [];
        if (term === ''){
            this.showAll();
            for (let node of this.nodes){
                node.searchTerm('');
            }
            return this.nodes;
        }

        for (var node of this.nodes){
            let visible = node.searchTerm(term)
            if (visible){
                nodes.push(node)
                let p = node.parent()
                while (p){
                    p.toggleState('visible', true)
                    p.toggleState('expanded', true)
                    p = p.parent()
                }
            }
        }
        return nodes
    }

    collapseToLevel(level: number){
        // Collapse any nodes > 'level'
        for (var n of this.nodes){
            if (n.level >= level){
                n.toggleState('expanded', false)
            }
        }
    }
}

interface ITreeNode {
    // A few properties directly from JSON
    id: Number;
    level: Number;
    parentId: Number;
    label: String;
    tree?: Tree;

}

class NodeStates {
    // Some different States which this node might be in
    visible: boolean;
    selected: boolean;
    expanded: boolean;
    selectable: boolean;


    constructor(){
        this.visible = true
        this.selected = false
        this.expanded = true
        this.selectable = true
    }
}

class TreeStates {
    loading: TreeLoadingState;

    constructor(){
        this.loading = TreeLoadingState.unknown;
    }
}

class TreeNode implements ITreeNode {

    id: Number;
    level: Number;
    parentId: Number;
    label: string;
    tree:Tree;
    search: string[];
    state:NodeStates;

    private _parent: TreeNode;
    private _children: TreeNode[];

    parent = () : TreeNode | void => {
        if(!this._parent){
            for (var node of this.tree.nodes){
                if (node.id === this.parentId) {
                    this._parent = node;
                    break; // As we only expect one parent node we break here
                }
            }
        }
        return this._parent;
    }

    children = () : TreeNode[] => {
        let children: TreeNode[] = this._children;
        if(!this._children){
            this._children = [];
            for (var node of this.tree.nodes){
                if (node.parentId === this.id) {
                    this._children.push(node)
                }
            }
        }
        return this._children;
    }

    constructor(id: number, level: number, parentId: number, label: string, tree?:Tree) {
        this.id = id;
        this.level = level;
        this.parentId = parentId;
        this.label = label;
        this.search = [];
        if (tree){
            this.tree = tree;
        }
        this.state = new NodeStates;
     }

    toggleState(stateName: string, state?: boolean){
        let returnState: boolean;
        switch(stateName) {
            case 'visible': returnState = this.toggleVisible(state); break;
            case 'selected': returnState = this.toggleSelected(state); break;
            case 'selectable': returnState = this.toggleSelectable(state); break;
            case 'expanded': returnState = this.toggleExpanded(state); break;
        }
        return returnState;
    }

    private toggleVisible(state?:boolean) : boolean {
        this.state.visible = state !== undefined ? state : !this.state.visible
        return this.state.visible
    }

    private toggleSelected(state?:boolean) : boolean {
        this.state.selected = state !== undefined ? state : !this.state.selected;
        return this.state.selected
    }

    private toggleSelectable(state:boolean) : boolean {
        this.state.selectable = state !== undefined ? state : !this.state.selectable;
        return this.state.selectable
    }

    private toggleExpanded(state?:boolean) : boolean {
        this.state.expanded = state !== undefined ? state : !this.state.expanded;
        return this.state.expanded;
    }

    private clearSearch(){
        this.search = [];
    }

    private setSearch(pre:string, term:string, post:string){
        this.search = [ pre, term, post]
    }

    searchTerm(term:string) {
        // If search term is matched
        const expr = new RegExp(term, 'i');
        const search = this.label.search(expr)
        const visible = search > -1
        const endSearch = visible ? search + term.length : 0

        this.toggleState('visible', visible)

        if (visible) {
            this.setSearch(
                this.label.substring(0, search),
                this.label.substring(search, endSearch),
                this.label.substring(endSearch, this.label.length)
            )
        } else {
            this.clearSearch();
        }
        
        return this.state.visible
    }

}

let treeFromArray = (nodes:any[], tree = new Tree()) : Tree => {
    for (let node of nodes){
        tree.createNode(node.id, node.level, node.parent, node.label)
      }
    return tree;
}

export let treeFromJson = (url:string) : Promise<Tree> => {
    const tree = new Tree();
    tree.setLoadingState(TreeLoadingState.loading);
    return fetch(url, { method: 'GET' })
      .then(function(response) { return response.json(); })
      .then(function(json:any[]){ 
          treeFromArray(json, tree)
            tree.setLoadingState(TreeLoadingState.done);
            return tree
        })
}