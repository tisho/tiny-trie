import {W, BASE64_CACHE} from './constants';



function ORD(ch) {
    // Used to be: return BASE64.indexOf(ch);
    return BASE64_CACHE[ch];
}


/**
    Given a string of data (eg, in BASE-64), the BitString class supports
    reading or counting a number of bits from an arbitrary position in the
    string.
*/
export default class BitString {

    constructor( str ) {
        this.bytes = str;
        this.length = this.bytes.length * W;
    }

    /**
      Returns the internal string of bytes
    */
    getData() {
        return this.bytes;
    }

    /**
        Returns a decimal number, consisting of a certain number, n, of bits
        starting at a certain position, p.
     */
    get( p, n ) {

        // case 1: bits lie within the given byte
        if ( ( p % W ) + n <= W ) {
            return ( ORD( this.bytes[ p / W | 0 ] ) & BitString.MaskTop[ p % W ] ) >>
                ( W - p % W - n );

        // case 2: bits lie incompletely in the given byte
        } else {
            var result = ( ORD( this.bytes[ p / W | 0 ] ) &
                BitString.MaskTop[ p % W ] );

            var l = W - p % W;
            p += l;
            n -= l;

            while ( n >= W ) {
                result = (result << W) | ORD( this.bytes[ p / W | 0 ] );
                p += W;
                n -= W;
            }

            if ( n > 0 ) {
                result = (result << n) | ( ORD( this.bytes[ p / W | 0 ] ) >>
                    ( W - n ) );
            }

            return result;
        }
    }

    /**
        Counts the number of bits set to 1 starting at position p and
        ending at position p + n
     */
    count( p, n ) {

        var count = 0;
        while( n >= 8 ) {
            count += BitString.BitsInByte[ this.get( p, 8 ) ];
            p += 8;
            n -= 8;
        }

        return count + BitString.BitsInByte[ this.get( p, n ) ];
    }

    /**
        Returns the number of bits set to 1 up to and including position x.
        This is the slow implementation used for testing.
    */
    rank( x ) {
        var rank = 0;
        for( var i = 0; i <= x; i++ ) {
            if ( this.get(i, 1) ) {
                rank++;
            }
        }

        return rank;
    }

};


BitString.MaskTop = [
    0x3f, 0x1f, 0x0f, 0x07, 0x03, 0x01, 0x00
];

BitString.BitsInByte = [
    0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1, 2, 2, 3, 2, 3, 3, 4, 2,
    3, 3, 4, 3, 4, 4, 5, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 5, 2, 3,
    3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3,
    4, 3, 4, 4, 5, 2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6, 2, 3, 3, 4,
    3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5, 6, 3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5,
    6, 6, 7, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3, 4, 4, 5, 2, 3, 3, 4, 3, 4,
    4, 5, 3, 4, 4, 5, 4, 5, 5, 6, 2, 3, 3, 4, 3, 4, 4, 5, 3, 4, 4, 5, 4, 5, 5,
    6, 3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7, 2, 3, 3, 4, 3, 4, 4, 5,
    3, 4, 4, 5, 4, 5, 5, 6, 3, 4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7, 3,
    4, 4, 5, 4, 5, 5, 6, 4, 5, 5, 6, 5, 6, 6, 7, 4, 5, 5, 6, 5, 6, 6, 7, 5, 6,
    6, 7, 6, 7, 7, 8
];
