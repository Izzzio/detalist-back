/**
 *
 * iZ³ | IZZZIO blockchain - https://izzz.io
 *
 * Detalist contract
 *
 */


/**
 * Address of main contract owner
 * @type {string}
 */
const CONTRACT_OWNER = 'izNqZ1mtGh4ZBYdgzbqkDm7bvKyueUEt8WP';


/**
 * Main Detalist contract
 */
class mainContract extends Contract {

    /**
     * Contract info
     */
    get contract() {
        return {
            owner: CONTRACT_OWNER,
            type: 'other',
        };
    }

    /**
     * Initialization and emission
     */
    init() {
        super.init();

        this._data = new BlockchainMap('data');

        this._items = new BlockchainMap('items');

        this._usedItems = new BlockchainMap('usedItems');

        this._code2Item = new BlockchainMap('code2item');

        /**
         * AddItem event
         * newId  code   bench  params additionalInfo
         * number string string string string
         * @type {Event}
         * @private
         */
        this._AddItemEvent = new Event('AddItem', 'number', 'string', 'string', 'string', 'string');

        /**
         * Broken item event
         * id     code   bench
         * number string string
         * @type {Event}
         * @private
         */
        this._BrokeEvent = new Event('Broke', 'number', 'string', 'string');


        if(contracts.isDeploy()) {
            this._data['autoIndex'] = 0;
        }
    }

    /**
     * Increments items storage index
     * @private
     */
    _incrementIndex() {
        this._data['autoIndex'] = this._data['autoIndex'] + 1;
    }

    /**
     * Adds new item
     * @param {string} code
     * @param {string} type
     * @param {string} addedBy
     * @param {string} bench
     * @param {object} params
     * @param {array}  parts
     * @param {object|array} additionalInfo
     * @returns {Number}
     */
    addItem(code, type, addedBy, bench, params, parts, additionalInfo = {}) {

        //Checking input data
        assert.defined(code, 'You must define item code');
        assert.defined(type, 'You must define item code');
        assert.defined(addedBy, 'You must define item code');
        assert.defined(params, 'You must define params');
        assert.true(Array.isArray(parts), 'Parts must be an array');

        const currIndex = this._data['autoIndex'];


        //Checking parts
        for (let partId of parts) {
            partId = Number(partId);
            if(partId >= currIndex) {
                throw new Error('You cant include youself or unlisted items as a part')
            }
            if(this._usedItems[partId]) {
                throw new Error(`This part ${partId} used in ${currIndex}. You can't use this part in new item.`);
            }
            this._usedItems[partId] = currIndex;
        }

        code = String(code);

        //Checking code uniq
        if(this._code2Item[code] !== null) {
            throw new Error(`Code ${code} already defined by ${this._code2Item[code]}`)
        }
        this._code2Item[code] = currIndex;

        //Save item
        this._items[currIndex] = {
            id: currIndex,
            code: code,
            type: type,
            addedBy: addedBy,
            bench: bench,
            params: params,
            parts: parts,
            broken: false,
            additionalInfo: additionalInfo
        };

        this._AddItemEvent.emit(currIndex, code, bench, JSON.stringify(params), JSON.stringify(additionalInfo));

        //Increment item counter
        this._incrementIndex();

        return currIndex;
    }

    /**
     * Recursively gets items with subparts
     * @param {number} id
     * @returns {object}
     * @private
     */
    _getItemWithSubitems(id) {
        let item = this._items[id];
        if(!item) {
            throw new Error(`Item ${id} not found`);
        }

        let parts = [];
        for (let part of item.parts) {
            parts.push(this._getItemWithSubitems(part));
        }

        item.parts = parts;

        return item;
    }

    /**
     * Get item public
     * @param {number} id
     * @returns {string}
     */
    getItem(id) {
        assert.true(typeof id !== 'undefined' && id !== null, 'Item id must be defined');
        id = Number(id);
        return JSON.stringify(this._getItemWithSubitems(id));
    }

    /**
     * Returns item by code
     * @param code
     * @returns {string}
     */
    getItemByCode(code) {
        assert.defined(code, 'Code must be defined');
        code = String(code);
        return this.getItem(this._code2Item[code]);
    }

    /**
     * Get all free items
     * @returns {string}
     */
    getAllItems() {
        let items = [];
        for (let i = 0; i < this._data['autoIndex']; i++) {
            if(this._usedItems[i] !== null) {
                continue;
            }
            items.push(this._getItemWithSubitems(i));
        }

        return JSON.stringify(items);
    }

    /**
     * Mark item broken
     * @param {number} id
     */
    markBroken(id) {
        assert.true(typeof id !== 'undefined' && id !== null, 'Item id must be defined');
        id = Number(id);

        let item = this._items[id];

        if(item.broken) {
            throw new Error('This item already marked as broken')
        }

        //Mark as broken
        item.broken = true;

        //Emit broke event
        this._BrokeEvent.emit(id, item.code, item.bench);

        //Save changes
        this._items[id] = item;
    }

    /**
     * Mark item broken by code
     * @param {string} code
     */
    markBrokenByCode(code) {
        assert.defined(code, 'Code must be defined');
        code = String(code);
        return this.markBroken(this._code2Item[code]);
    }

}

global.registerContract(mainContract);
