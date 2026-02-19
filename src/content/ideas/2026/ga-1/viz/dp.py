# %%

import pprint as pp

# %% [markdown]
### 6.7 Longest Palindromic Subsequence
# non-contiguous (with deletions)
# %%

x = ["a", "g", "c", "a"]
y = list(reversed(x))
n = len(x)
L = [[0] * (n + 1) for _ in range(n + 1)]

pp.pprint(x)
pp.pprint(y)
print('before')
pp.pprint(L)


for i in range(n):
    for j in range(n):
        if x[i] == y[j]:
            L[i + 1][j + 1] = L[i][j] + 1
        else:
            L[i + 1][j + 1] = max(L[i][j + 1], L[i + 1][j])

print('after')
pp.pprint(L)

print("answer: ", L[n][n])
# %% [markdown]
### 6.8 Longest Common Substring

# %%
x = list("bans")
y = list("banana")
n = len(x)
m = len(y)
L = [[0] * (m + 1) for _ in range(n + 1)]

pp.pprint(x)
pp.pprint(y)
print('before')
pp.pprint(L)

for i in range(n):
    for j in range(m):
        if x[i] == y[j]:
            L[i + 1][j + 1] = L[i][j] + 1
        else:
            L[i + 1][j + 1] = 0

print('after')
pp.pprint(L)

print("answer: ", max([max(row) for row in L]))


# %% [markdown]
### 6.8 Longest Common Substring

# %%

n = 20
cuts = [3,10,12,15]

# 1. Setup the augmented array
# We add 0 at the start and n at the end to represent the string boundaries.
C = [0] + cuts + [n]
M = len(C)

# 2. Initialize the DP table with zeros
# T[i][j] stores the min cost to make cuts between boundary C[i] and boundary C[j].
# By initializing to 0, our base cases (where j = i + 1, meaning 0 cuts) are already handled.
T = [[0] * M for _ in range(M)]

print('before')
print("C", C)
pp.pprint(T)


# 3. Fill the table diagonally
# L represents the "length" of the subproblem (number of segments between i and j)
# L = 1 means no cuts inside, which is cost 0. So we start L from 2.
for L in range(2, M):
    
    # i is the start index of our interval
    for i in range(M - L):
        
        # j is the end index of our interval
        j = i + L
        
        # Find the minimum cost by trying every possible cut 'k' between i and j
        min_cost = float('inf')
        for k in range(i + 1, j):
            cost = T[i][k] + T[k][j]
            print(L, i, j, k, cost)
            if cost < min_cost:
                min_cost = cost
                
        # Recurrence: (Length of current string piece) + (Min cost of internal cuts)
        T[i][j] = (C[j] - C[i]) + min_cost
        
    pp.pprint(T)
        
print('after')
pp.pprint(T)
        
# 4. Extract the answer
# We want the cost of cuts from the absolute beginning (0) to the absolute end (M-1)
print("answer", T[0][M-1])


