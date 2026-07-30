export class Parser {
  /**
   * Evaluates tokens and returns an array of matches.
   * Each match should have:
   * { startToken: number, endToken: number, value: any, confidence: number }
   * 
   * Confidence is typically between 0.0 and 1.0. 
   * Higher confidence wins when overlaps occur.
   */
  parse(_tokens, _context) {
    return []
  }
}
