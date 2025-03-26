import ForceGraph3D from '3d-force-graph';
//import ForceGraph from 'force-graph';
import SpriteText from 'three-spritetext';

import collocations from './collocations.json';

const allIds = collocations.nodes.map(n => n.id);

const featureMap = new Map([
    ['noun','n'],
    ['pronoun','pr'],
    ['adjective','ad'],
    ['verbal noun','vn'],
    ['pronominalised noun','pn'],
    ['participial noun','pt'],
    ['verbal root','vr'],
    ['root noun','rn'],
    ['finite verb','fv'],
    ['peyareccam','py'],
    ['infinitive','in'],
    ['absolutive','ab'],
    ['habitual future','hf'],
    ['conditional','cd'],
    ['imperative','im'],
    ['optative','op'],
    ['subjunctive','su'],
    ['interjection','ij'],
    ['imperfective verb','ia'],
    ['perfective verb','pa'],
    ['other','o']
]);

const reverseMap = new Map([...featureMap].map(e => [...e].reverse()));

var oldNPMI = 0.85;
const keyNodes = new Set();

const colgraph = ForceGraph3D();
//const colgraph = new ForceGraph();

const focusNode = node => {
          // Aim at node from outside it
          const distance = 200;
          const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

          const newPos = node.x || node.y || node.z ? 
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
            : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

          colgraph.cameraPosition(
            newPos, // new position
            node, // lookAt ({ x, y, z })
            1000  // ms transition duration
        );
    //const npmi = document.getElementById('npmi').value;
    const olddata = colgraph.graphData();
    const oldlinks = new Set(olddata.links.map(l => l.id));
    const oldnodes = new Set(olddata.nodes.map(n => n.id));
    keyNodes.add(node.id);  
    updateGraph(oldnodes,oldlinks);
    /*
    const colclone = {};
    colclone.nodes = collocations.nodes; // all nodes as graph objects
    colclone.links = structuredClone(collocations.links); // all original links

    colclone.links = colclone.links.filter(l => {
        if(oldlinks.has(l.id)) return true;
        else
            return l.strength >= npmi && (l.source === node.id || l.target === node.id);
    });
    const connected = getConnected(colclone.links);
    colclone.nodes = colclone.nodes.filter(n => oldnodes.has(n.id) || connected.has(n.id));
    colgraph.graphData({nodes: colclone.nodes, links: colclone.links});
    */
};

const makeGraph = () => {
    const colours = new Map([
        ['adjective','#66c2a5'],
        ['pronoun','#8da0cb'],
        ['noun','#fc8d62'],
        ['verbal noun','#fc8d62'],
        ['pronominalised noun','#fc8d62'],
        ['participial noun','#fc8d62'],
        ['root noun','#fc8d62'],
        ['imperfective verb','#e78ac3'],
        ['perfective verb','#e78ac3'],
        ['peyareccam','#e78ac3'],
        ['verbal root','#e78ac3'],
        ['infinitive','#e78ac3'],
        ['absolutive','#e78ac3'],
        ['habitual future','#e78ac3'],
        ['conditional','#e78ac3'],
        ['imperative','#e78ac3'],
        ['optative','#e78ac3'],
        ['subjunctive','#e78ac3'],
        ['other','#a6d854'],
        ['interjection','#a6d854']
    ]);
    const legend = document.getElementById('panellegend');
    legend.innerHTML = [...colours].map(c =>
        `<div><input type="checkbox" name="${featureMap.get(c[0])}" checked autocomplete="off"/><label><span style="color:${c[1]}; font-size: 150%">●</span> ${c[0]}</div>`).join('');

    const colclone = {};
    colclone.nodes = collocations.nodes; // all nodes as graph objects
    colclone.links = structuredClone(collocations.links); // all original links
    /* 
    keyNodes.add('cēṇ|n');
    const newlinks = colclone.links.filter(l => l.source === 'cēṇ|n' || l.target == 'cēṇ|n');
    const connected = getConnected(newlinks);
    const newnodes = colclone.nodes.filter(n => connected.has(n.id));
    */
    colgraph(document.getElementById('colgraph'))
        //.graphData({nodes: newnodes, links: newlinks})
        .nodeId('id')
        .nodeLabel(n => `${reverseMap.get(n.type)}<hr>${n.size} occurences`)
        .nodeThreeObject(n => {
            const sprite = new SpriteText(n.form);
            sprite.material.depthWrite = false;
            sprite.color = colours.get(reverseMap.get(n.type)) || colours.get('other');
            const logsize = Math.log(n.size);
            sprite.textHeight = logsize + 5;
            return sprite;
        })
        //.nodeVal(n => n.size/30)
        //.nodeAutoColorBy('type')
        .linkWidth(l => l.strength*5)
        .linkOpacity(0.3)
        .linkDirectionalArrowLength(5)
        .linkCurvature(l => l.curvature || 0)
        .linkLabel(l => `${l.citations.join(', ')} (NPMI: ${l.strength.toPrecision(4)})`)
        .linkColor(() => 'rgba(255,255,255,0.5')
        .onNodeClick(focusNode);
    
    colgraph.d3Force('link')
            .distance(l => 40/l.strength);
    
    togglePanel({target: document.getElementById('paneltoggle')});
};

const togglePanel = (e) => {
    const panel = document.getElementById('panel');
    if(panel.style.display !== 'flex') {
        panel.animate(
            [{ marginTop: '-25px'},{ marginTop: '0px'}],
            {duration: 200, iterations: 1}
        );

        panel.style.display = 'flex';
        e.target.textContent = '⇧';
    }
    else {
        panel.animate(
            [{ marginTop: '0px'},{ marginTop: '-25px'}],
            {duration: 200, iterations: 1}
        );
        setTimeout(() => panel.style.display = 'none',200);
        e.target.textContent = '⇩';
    }
};

const getConnected = (links,isobj=false) => {
    const ret = new Set();
    for(const link of links) {
        if(isobj) {
            ret.add(link.source.id);
            ret.add(link.target.id);
        }
        else {
            ret.add(link.source);
            ret.add(link.target);
        }
    }
    return ret;
};
/*
const updateGraph = () => {
    const word = document.getElementById('findword').value;
    if(!word) {
        alert(`${word} not found.`);
        return;
    }

    const wordid = word;
    const colclone = {};
    colclone.nodes = collocations.nodes; // all nodes as graph objects
    colclone.links = structuredClone(collocations.links); // all original links

    const npmi = document.getElementById('npmi').value;
    colclone.links = colclone.links.filter(l => l.strength >= npmi && (l.source === wordid || l.target === wordid));
    const connected = getConnected(colclone.links);
    colclone.nodes = colclone.nodes.filter(n => connected.has(n.id));

    const inputs = document.getElementById('panellegend').querySelectorAll('input:not([name="solonodes"])');
    const checked = new Set([...inputs].filter(i => i.checked).map(i => i.getAttribute('name')));
    if(checked.size !== inputs.length) {
        colclone.nodes = colclone.nodes.filter(n => checked.has(n.type));
        const checkednodes = new Set(colclone.nodes.map(n => n.id));
        colclone.links = colclone.links.filter(l => checkednodes.has(l.target) && checkednodes.has(l.source));
    }

    colgraph.graphData(colclone);
};
*/
const updateNPMI = (e) => {
    const npmi = e.target.value;
    if(npmi === oldNPMI) return;
    if(npmi > oldNPMI) {
        const olddata = colgraph.graphData();
        const newlinks = olddata.links.filter(l => l.strength > npmi);
        const connected = getConnected(newlinks, true);
        const newnodes = olddata.nodes.filter(n => connected.has(n.id));
        colgraph.graphData({nodes: newnodes, links: newlinks});
    }
    else updateGraph();
    oldNPMI = npmi;
};
const updatePos = e => {
    if(e.target.type !== 'checkbox') return;

    updateGraph();
};
const updateGraph = (oldlinks = new Set(),oldnodes = new Set()) => {
    const npmi = document.getElementById('npmi').value;
    const colclone = {};
    colclone.nodes = collocations.nodes; // all nodes as graph objects
    colclone.links = structuredClone(collocations.links); // all original links
    
    const inputs = document.getElementById('panellegend').querySelectorAll('input');
    const checked = new Set([...inputs].filter(i => i.checked).map(i => i.getAttribute('name')));
    if(checked.size !== inputs.length) {
        colclone.nodes = colclone.nodes.filter(n => checked.has(n.type));
        const checkednodes = new Set(colclone.nodes.map(n => n.id));
        colclone.links = colclone.links.filter(l => checkednodes.has(l.target) && checkednodes.has(l.source));
    }

    colclone.links = colclone.links.filter(l => {
        if(oldlinks.has(l.id)) return true;
        else
            return l.strength > npmi && (keyNodes.has(l.source) || keyNodes.has(l.target));
    });
    const connected = getConnected(colclone.links);
    colclone.nodes = colclone.nodes.filter(n => oldnodes.has(n.id) || keyNodes.has(n.id) || connected.has(n.id));
    colgraph.graphData({nodes: colclone.nodes, links: colclone.links});
};

const findWord = e => {
    const outbox = document.getElementById('foundwords');
    if(e.key === 'Escape') {
        outbox.style.display = 'none';
        return;
    }
    const topleft = document.getElementById('findword').getBoundingClientRect().bottom;
    outbox.style.display = 'flex';
    outbox.style.top = topleft + 2 + 'px';
    outbox.innerHTML = allIds.filter(i => i.startsWith(e.target.value))
                             .slice(0,10)
                             .map(e => {
                                 const [lemma, abbr] = e.split('|');
                                 return `<span class="searchitem" data-id="${e}"><span class="lemma">${lemma}</span><span class="pos">${reverseMap.get(abbr)}</span></span>`;
                                 })
                             .join('');
};

const searchOrQuit = e => {
    const foundwords = document.getElementById('foundwords');
    const searchitem = e.target.closest('.searchitem');
    if(!searchitem) {
        foundwords.style.display = 'none';
        return;
    }
    keyNodes.add(searchitem.dataset.id);
    updateGraph();
    foundwords.style.display = 'none';
    document.getElementById('findword').value = '';
};

document.getElementById('paneltoggle').addEventListener('click',togglePanel);
document.getElementById('panellegend').addEventListener('click',updatePos);
document.getElementById('npmi').addEventListener('change',updateNPMI);
document.getElementById('findword').addEventListener('keyup',findWord);
document.body.addEventListener('click',searchOrQuit);
makeGraph();
