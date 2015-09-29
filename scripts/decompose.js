math.config({matrix: 'array'});

/** */
var FIRST_RESULT_MATRIX = 0;

/** The result to return if there is no decomposition */
var NO_DECOMP_RESULT = [];

/**
 * Moving rows such that each column's max value is on the diagonal ensures us the
 * resulting matrix has a LU decomposition. The function will search for the max
 * value in each column and will generate the P matrix
 * @param M input matrix.
 * @return P a matrix such that P*M is a matrix that has an LU decomposition.
 */
function getRowSwapMatrix(M) {
    var P = math.eye(M.length);  // the P matrix is initially the identity matrix

    for (var col = 0; col < M.length; col++) {
        var maxRow = col;
        
        // search for max value
        for (var row = col; row < M.length; row++) {
            if (M[row][col] > M[maxRow][col]) {
                maxRow = row;
            }
        }
        
        // change the P matrix according to the max value's row
        if (maxRow != col) {
            var temp = P[col];
            P[col] = P[maxRow];
            P[maxRow] = temp;
        }
    }
    return P;
}

/**
 * @param M Matrix to decompose into LU components.
 * @return Array [[L0, L1, L2, ...], [U0, U1, U2, ...]]
 */
function decomposeLU(M) {
    var logL = [],  // keeps a log of the L matrices
        logU = [],  // log of U matrices
        curL;       // the current L matrix

    logL.push(math.eye(M.length));
    logU.push(math.clone(M));

    for (var col = 0; col < M.length - 1; col++) {
        curL = math.eye(M.length);

        // generate the curL matrix, and use it to zero out the current column in U
        for (var row = col + 1; row < M.length; row++) {
            // need to divide by M[col][col], so if it's 0 decomposition is impossible!
            if (M[col][col] === 0) {
                return NO_DECOMP_RESULT;
            }
            if (M[row][col] !== 0) {
                curL[row][col] = M[row][col] / M[col][col];
                M[row] = math.add(M[row], math.multiply(-curL[row][col], M[col]));
            }
        }

        // log the matrices.
        // notice that L*curL gives the L matrix for this decomposition stage
        logL.push(math.multiply(logL[col], curL));
        logU.push(math.clone(M));
    }

    // remove the first elements that aren't needed
    logL.shift();
    logU.shift();

    return [logL, logU];
}

/**
 * Given an M matrix and a row number, compute the v row matrix for the LDLt algorithm.
 * @param M Input matrix.
 * @param row The current row.
 * @return Array The v matrix.
 */
function computeV(M, row) {
    var v,
        range;  // temporary range variable used for computation
    v = math.zeros(row + 1);
    for (var col = 0; col < row; col++) {
        v[col] = M[row][col] * M[col][col];
    }
    v[row] = M[row][row];
    if (row > 0) {
        range = math.range(0, row);
        v[row] -= math.multiply(
            math.subset(M, math.index(row, range)),
            math.subset(v, math.index(range))
        );
    }
    return v;
}

/**
 * Compute L(row+1:n, row), and return the input matrix with the updated column.
 * @param M The input matrix to be updated.
 * @param v The v matrix for the current row.
 * @param row The current row.
 * @return Array the updated M matrix.
 */
function computeLColumn(M, v, row) {
    var n = M.length,
        matrixIndex,// an index used for matrix operations
        firstRange, // a temp range used for matrix operations
        secRange;   // another one

    firstRange = math.range(row + 1, n);        // j + 1:n
    matrixIndex = math.index(firstRange, row);  // (j+1:n, j)

    // if this is the first row, no need to perform the subtraction in the algorithm
    if (row === 0) {
        M = math.subset(M, matrixIndex, math.divide(math.subset(M, matrixIndex), v[row]));
    } else {
        secRange = math.range(0, row);  // (1:j-1)
        M = math.subset(M, matrixIndex,
            math.divide(
                math.subtract(
                    math.subset(M, matrixIndex),
                    math.multiply(
                        math.subset(M, math.index(firstRange, secRange)),
                        math.subset(v, math.index(secRange)))),
                v[row]
            )
        );
    }
    return M;
}

/**
 * Based on the algorithm in p. 139 of Matrix Computations by Golub-Van Loan
 * @param M Matrix to decompose into LDLt components.
 * @return Array [[A0, A1, A2, ...], [V0, V1, V2, ...]], where A contains
 * both L (below the diagonal), and D (on the diagonal)
 */
/**
function decomposeLDL(M) {
    var n = M.length,
        v,          // temporary matrix used for computation
        logA = [],  // a log of the A matrices
        logV = [];  // a log of the V matrices

    for (var row = 0; row < n; row++) {
        v = computeV(M, row);
        if (v[row] === 0) {
            return NO_DECOMP_RESULT;  // No LU factorization, can't continue!
        }
        M[row][row] = v[row];

        // if row == n-1, nothing more to compute
        if (row !== n - 1) {
            M = computeLColumn(M, v, row);
        }

        // log the matrices
        logV.push([math.clone(v)]);  // need to insert into array for printing purposes
        logA.push(math.clone(M));
    }

    return [logA, logV];
}
*/
 /**  new version, doesn't work
  */
function decomposeLDL(M) {
     var n = M.length,
        L = [],
        d = [],
        D,
        curColIndex,    // the indices for the current column
        curColValues,   // the values of the current column
        logM = [];      // a log of the A matrices

    // note that L starts empty, and in each iteration we add a single column to it.
    for (var row = 0; row < n; row++) {
        // insert to curColIndex the math.js representation for the indices of the current column
        curColIndex = math.index(math.range(0, n), row);
        d.push(M[row][row]);    //

        if (d[row] + 1 > 1) {
            // using curColIndex, the function math.subset will get the current column values from the matrix M
            curColValues = math.subset(M, curColIndex);

            // add to L
            L.push(math.divide(curColValues, d[row]));
            M = math.subset(M, curColIndex, math.subtract(math.subset(M, curColIndex),
                                                          math.dotMultiply(L[row], curColValues)));
        } else {
            //
            L.push(math.zeros(n, 1));
            L[row][row] = [1];
        }

        // log the matrices
        logM.push(math.clone(M));
    }

    // notice that L currently looks like this:
    // [[[L11], [L12], ...], [[L21], [L22], ...], ...]
    // squeeze "flattens" each row to look like this: [Li1, Li2, Li3, ...]
    // also, L currently is actually Lt, so transpose it.
    L = math.transpose(math.squeeze(L));

    // Generate D from d
    D = math.eye(n);
    for (var row = 0; row < n; row++) {
        D[row][row] = d[row];
    }

    // validity check, code will be removed after fixing the decomposition
    window.alert(L);
    window.alert(D);
    window.alert(math.multiply(math.multiply(L, D), math.transpose(L)));

    return [logM, L, D];
}