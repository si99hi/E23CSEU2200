const { log } = require('../utils/logWrapper');

const typeOrder = {
    'Placement': 3,
    'Result': 2,
    'Event': 1
};

function getPriorityScore(item) {
    let weight = typeOrder[item.Type] || 0;
    let time = 0;
    
    if (item.Timestamp) {
        time = new Date(item.Timestamp).getTime();
    }
    
    return (weight * 10000000000000) + time;
}

function getTopItems(items, limit = 10) {
    if (!items || items.length === 0) {
        return [];
    }
    
    const scored = [];
    for (let i = 0; i < items.length; i++) {
        scored.push({
            ...items[i],
            priorityScore: getPriorityScore(items[i])
        });
    }
    
    for (let i = 0; i < scored.length - 1; i++) {
        for (let j = 0; j < scored.length - i - 1; j++) {
            if (scored[j].priorityScore < scored[j + 1].priorityScore) {
                let temp = scored[j];
                scored[j] = scored[j + 1];
                scored[j + 1] = temp;
            }
        }
    }
    
    const result = [];
    for (let i = 0; i < limit && i < scored.length; i++) {
        let { priorityScore, ...rest } = scored[i];
        result.push(rest);
    }
    
    return result;
}

class TopKHeap {
    constructor(k = 10) {
        this.k = k;
        this.heap = [];
    }
    
    addItem(item) {
        let score = getPriorityScore(item);
        let newItem = { ...item, heapScore: score };
        
        if (this.heap.length < this.k) {
            this.heap.push(newItem);
            this.bubbleUp(this.heap.length - 1);
        } else if (score > this.heap[0].heapScore) {
            this.heap[0] = newItem;
            this.sinkDown(0);
        }
    }
    
    bubbleUp(pos) {
        while (pos > 0) {
            let parent = Math.floor((pos - 1) / 2);
            if (this.heap[parent].heapScore <= this.heap[pos].heapScore) {
                break;
            }
            let temp = this.heap[parent];
            this.heap[parent] = this.heap[pos];
            this.heap[pos] = temp;
            pos = parent;
        }
    }
    
    sinkDown(pos) {
        let length = this.heap.length;
        while (true) {
            let left = 2 * pos + 1;
            let right = 2 * pos + 2;
            let swap = null;
            let current = this.heap[pos];
            
            if (left < length && this.heap[left].heapScore < current.heapScore) {
                swap = left;
            }
            
            if (right < length) {
                let compare = this.heap[right];
                if ((swap === null && compare.heapScore < current.heapScore) ||
                    (swap !== null && compare.heapScore < this.heap[left].heapScore)) {
                    swap = right;
                }
            }
            
            if (swap === null) break;
            
            let temp = this.heap[swap];
            this.heap[swap] = this.heap[pos];
            this.heap[pos] = temp;
            pos = swap;
        }
    }
    
    getTop() {
        let copy = [...this.heap];
        copy.sort((a, b) => b.heapScore - a.heapScore);
        return copy.map(item => {
            let { heapScore, ...rest } = item;
            return rest;
        });
    }
}

module.exports = { getTopItems, TopKHeap, getPriorityScore };