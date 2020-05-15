/* eslint-env mocha */
import { Trie } from './Trie';
import { PackedTrie } from './PackedTrie';
import { assert } from 'chai';

describe('PackedTrie', () => {
    describe('constructor', () => {
        it('should parse header fields on init', () => {
            const encoded = 'BAAAAABAwIfboarzKTbjds1FDB';
            const trie = new PackedTrie(encoded);

            assert.strictEqual(trie['offset'], 1);
            assert.deepEqual(trie['table'], {
                '\0': 0,
                f: 1,
                b: 2,
                o: 3,
                a: 4,
                r: 5,
                z: 6,
            });
            assert.strictEqual(trie['wordWidth'], 6);
            assert.strictEqual(trie['lastMask'], parseInt('1', 2));
            assert.strictEqual(trie['pointerMask'], parseInt('11', 2));
            assert.strictEqual(trie['pointerShift'], 1);
            assert.strictEqual(trie['charMask'], parseInt('111', 2));
            assert.strictEqual(trie['charShift'], 3);
            assert.strictEqual(trie['data'], encoded.substr(16));
        });

        it('should throw a version mismatch error if encoded string differs from reader version', () => {
            const encoded = 'BD/wAABAwIfboarzKTbjds1FDB';
            assert.throws(() => new PackedTrie(encoded));
        });
    });

    describe('test', () => {
        it('should determine whether an item is in the Trie', () => {
            const encoded = 'BAAAAABAwIfboarzKTbjds1FDB';
            const trie = new PackedTrie(encoded);

            ['foo', 'bar', 'baz'].forEach((w) => assert(trie.test(w)));
            ['fu', 'boer', 'batz'].forEach((w) => assert(!trie.test(w)));
        });

        it('should provide the same answers as a full Trie', () => {
            [
                ['Africa', 'Asia', 'North America', 'South America', 'Europe', 'Antarctica'],
                ['red', 'yellow', 'green', 'aliceblue', 'pink', 'rose'],
                ['agricola', 'agricolae', 'agricolae', 'agricolam', 'agricolā'],
                ['любить', 'люблю', 'любишь', 'любит', 'любим', 'любите', 'любят'],
            ].forEach((words) => {
                const sdrow = words.slice().map((w) => w.split('').reverse().join(''));
                const trie = new Trie();
                words.forEach((w) => trie.insert(w));
                words.forEach((w) => assert(trie.test(w)));
                sdrow.forEach((s) => assert(!trie.test(s)));
                const encoded = trie.freeze().encode();
                const packed = new PackedTrie(encoded);
                words.forEach((w) => assert(packed.test(w)));
                sdrow.forEach((s) => assert(!packed.test(s)));
            });
        });

        it('returns true for fuzzy matches when wildcard is given', () => {
            const trie = new Trie();
            trie.insert('foo');
            trie.insert('bar');
            trie.insert('bop');
            trie.insert('baz');
            const packed = new PackedTrie(trie.freeze().encode());

            assert(packed.test('***', { wildcard: '*' }));
            assert(packed.test('**r', { wildcard: '*' }));
            assert(packed.test('*az', { wildcard: '*' }));
            assert(packed.test('f**', { wildcard: '*' }));
            assert(packed.test('f*o', { wildcard: '*' }));
            assert(!packed.test('**x', { wildcard: '*' }));
        });

        it('returns true for partial matches when searching over prefixes', () => {
            const trie = new Trie();
            trie.insert('foo');
            trie.insert('food');
            trie.insert('foodology');
            const packed = new PackedTrie(trie.freeze().encode());

            assert(packed.test('fo', { prefix: true }));
            assert(packed.test('foodolog', { prefix: true }));
            assert(!packed.test('fob', { prefix: true }));
        });

        it('returns correct value for complex options cases', () => {
            const trie = new Trie();
            trie.insert('foo');
            trie.insert('bar');
            trie.insert('foobar');
            const packed = new PackedTrie(trie.freeze().encode());

            assert(packed.test('foo', { wildcard: '*' }));
            assert(packed.test('bar', { wildcard: '*' }));
            assert(!packed.test('foob', { wildcard: '*', prefix: false }));
            assert(packed.test('foobar', { wildcard: '*', prefix: false }));
            assert(packed.test('foob*', { wildcard: '*', prefix: true }));
            assert(!packed.test('foob*', { wildcard: '*', prefix: false }));
            assert(packed.test('**ob*', { wildcard: '*', prefix: true }));
        });
    });

    describe('search', () => {
        const encoded = 'BMAAAAABAQfbgtoarleFBKNiPVzXZyxVzPV6vfbxWqzeazC0VCYQloNBYJg4BAIB';
        const trie = new PackedTrie(encoded);

        it('returns all matching values with wildcard', () => {
            assert.deepEqual(trie.search('*oo', { wildcard: '*' }), ['foo', 'boo', 'goo']);
            assert.deepEqual(trie.search('*oo', { wildcard: '*', prefix: true }), [
                'foo',
                'boo',
                'goo',
                'fool',
                'tool',
            ]);
            assert.deepEqual(trie.search('f**', { wildcard: '*' }), ['foo', 'far']);
            assert.deepEqual(trie.search('*x*', { wildcard: '*' }), []);
        });

        it('returns first match with wildcard', () => {
            assert(trie.search('f**', { wildcard: '*', first: true }) === 'foo');
            assert(trie.search('**x', { wildcard: '*', first: true }) === null);
            assert.deepEqual(trie.search('*', { wildcard: '*', prefix: true }), [
                'foo',
                'far',
                'bar',
                'boo',
                'goo',
                'gar',
                'fool',
                'bare',
                'tool',
            ]);
        });
    });

    describe('hasChar', () => {
        it('should determine whether a character is present in any words in the Trie', () => {
            const trie = new Trie();
            trie.insert('foo');
            trie.insert('bar');
            trie.insert('foobar');
            const packed = new PackedTrie(trie.freeze().encode());

            assert(packed.hasChar('a'));
            assert(packed.hasChar('f'));
            assert(packed.hasChar('o'));
            assert(packed.hasChar('r'));
            assert(!packed.hasChar('c'));
            assert(!packed.hasChar('d'));
            assert(!packed.hasChar('e'));
            assert(!packed.hasChar('z'));
        });
    });

    describe('getNodeAtPointer', () => {
        it('should return the node at the specified pointer location', () => {
            const trie = new Trie();
            ['foo', 'bar', 'baz', 'foobar', 'hello', 'hell', 'helix'].forEach((word) => trie.insert(word));
            const packed = new PackedTrie(trie.freeze().encode());

            assert.deepEqual(packed.getNodeAtPointer(0), { char: 'f', last: false, childrenPointer: 3 });
            assert.deepEqual(packed.getNodeAtPointer(3), { char: 'o', last: true, childrenPointer: 6 });
            assert.deepEqual(packed.getNodeAtPointer(6), { char: 'o', last: true, childrenPointer: 10 });
            assert.deepEqual(packed.getNodeAtPointer(10), { char: '\u0000', last: false, childrenPointer: null });
            assert.deepEqual(packed.getNodeAtPointer(11), { char: 'b', last: true, childrenPointer: 16 });
            assert.deepEqual(packed.getNodeAtPointer(16), { char: 'a', last: true, childrenPointer: 20 });
            assert.deepEqual(packed.getNodeAtPointer(20), { char: 'r', last: true, childrenPointer: 12 });
            assert.deepEqual(packed.getNodeAtPointer(12), { char: '\u0000', last: true, childrenPointer: null });
        });

        it('should return a terminal node when reading a pointer beyond the size of the trie data', () => {
            const trie = new Trie();
            ['foo', 'bar', 'baz', 'foobar', 'hello', 'hell', 'helix'].forEach((word) => trie.insert(word));
            const packed = new PackedTrie(trie.freeze().encode());

            const terminal = { char: '\u0000', last: false, childrenPointer: null };

            assert.deepEqual(packed.getNodeAtPointer(packed.data.length + 100), terminal);
            assert.deepEqual(packed.getNodeAtPointer(packed.data.length + 200), terminal);
            assert.deepEqual(packed.getNodeAtPointer(packed.data.length + 300), terminal);
            assert.deepEqual(packed.getNodeAtPointer(packed.data.length + 400), terminal);
        });
    });
});
