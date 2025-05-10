export class PseudoRandom {
  // Internal state (two 32-bit integers)
  private state0: number;
  private state1: number;

  // Keep these variables to maintain the exact same interface
  private m: number = 0x80000000; // 2**31
  private a: number = 1103515245;
  private c: number = 12345;
  private state: number;

  constructor(seed: number) {
    // Initialize the XorShift state with seed
    this.state0 = seed | 0; // Force to 32-bit integer with bitwise OR
    this.state1 = 0x6e2d786c; // Fixed value as second seed (arbitrary prime)

    // Ensure non-zero state
    if (this.state0 === 0) this.state0 = 1;

    // Also set the LCG state variable to maintain interface
    this.state = seed % this.m;
    if (this.state < 0) this.state += this.m;

    // Warm up the generator to improve initial distribution
    for (let i = 0; i < 20; i++) {
      this._nextIntInternal();
    }
  }

  /**
   * Internal function that implements XorShift algorithm
   * @returns A 32-bit integer
   */
  private _nextIntInternal(): number {
    // Get current state
    let s1 = this.state0;
    const s0 = this.state1;

    // Update state using XorShift algorithm (all operations are bitwise)
    this.state0 = s0;
    s1 ^= s1 << 23;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.state1 = s1;

    // Generate output (force 32-bit integer)
    return (this.state0 + this.state1) | 0;
  }

  /**
   * Generates the next pseudorandom number.
   * @returns A number between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    // Get a 32-bit integer and convert to [0,1) range
    // Using >>> 0 to get unsigned interpretation (positive number)
    const int = this._nextIntInternal() >>> 0;

    // Update the state variable to maintain compatibility with original interface
    this.state = int % this.m;

    // Convert to [0,1) range - using division for same interface
    return this.state / this.m;
  }

  /**
   * Generates a random integer between min (inclusive) and max (exclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min) + min);
  }

  /**
   * Generates a random float between min (inclusive) and max (exclusive).
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generates a random ID (8 characters, alphanumeric).
   */
  nextID(): string {
    return this.nextInt(0, Math.pow(36, 8)) // 36^8 possibilities
      .toString(36) // Convert to base36 (0-9 and a-z)
      .padStart(8, "0"); // Ensure 8 chars by padding with zeros
  }

  /**
   * Selects a random element from an array.
   */
  randElement<T>(arr: T[]): T {
    if (arr.length == 0) {
      throw new Error("array must not be empty");
    }
    return arr[this.nextInt(0, arr.length)];
  }

  /**
   * Returns true with probability 1/odds.
   */
  chance(odds: number): boolean {
    return this.nextInt(0, odds) == 0;
  }

  /**
   * Returns a shuffled copy of the array using Fisher-Yates algorithm.
   */
  shuffleArray<T>(array: T[]): T[] {
    // Create a copy to avoid modifying the original array
    const arrayCopy = [...array];

    for (let i = arrayCopy.length - 1; i >= 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
    }

    return arrayCopy;
  }
}
