# %%
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.preprocessing import StandardScaler
import seaborn as sns

# Load iris dataset
from sklearn.datasets import load_iris

iris = load_iris()

# %% Example of classification and regression

# Set up the figure with two subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

# === CLASSIFICATION SUBPLOT ===
# Use sepal length and sepal width for 2D visualization
X_class = iris.data[:, :2]  # sepal length and width
y_class = iris.target

# Create a mesh for decision boundary
h = 0.02
x_min, x_max = X_class[:, 0].min() - 1, X_class[:, 0].max() + 1
y_min, y_max = X_class[:, 1].min() - 1, X_class[:, 1].max() + 1
xx, yy = np.meshgrid(np.arange(x_min, x_max, h),
                     np.arange(y_min, y_max, h))

# Fit logistic regression
clf = LogisticRegression(random_state=42, max_iter=200)
clf.fit(X_class, y_class)

# Predict on mesh
Z = clf.predict(np.c_[xx.ravel(), yy.ravel()])
Z = Z.reshape(xx.shape)
# Plot decision boundary
contour_colors = ["#BE829E", "#E8F1A0", "#FFDE59"]
ax1.contourf(xx, yy, Z, alpha=0.4, zorder=1)

# Plot data points
colors = ["#270037", "#06726d", "#d9c40b"]
# colors = ["#BE829E", "#E8F1A0", "#FFDE59"]
for i, color in enumerate(colors):
    idx = np.where(y_class == i)
    ax1.scatter(X_class[idx, 0], X_class[idx, 1], 
                c=color, s=60, alpha=0.8, edgecolors='white', linewidth=1)

ax1.set_xlabel('Sepal Length (cm)', fontsize=16)
ax1.set_ylabel('Sepal Width (cm)', fontsize=16)
ax1.set_title('Classification', fontsize=20, fontweight='bold')
ax1.grid(True, alpha=0.3, zorder=2)

# === REGRESSION SUBPLOT ===
# Create synthetic regression data based on iris features
# Use petal length to predict petal width
X_reg = iris.data[:, 2].reshape(-1, 1)  # petal length
y_reg = iris.data[:, 3]  # petal width

# Fit linear regression
reg = LinearRegression()
reg.fit(X_reg, y_reg)

# Create prediction line
X_line = np.linspace(X_reg.min(), X_reg.max(), 100).reshape(-1, 1)
y_line = reg.predict(X_line)

# Plot regression
ax2.scatter(X_reg, y_reg, s=60, alpha=0.7, edgecolors='white', linewidth=1)
ax2.plot(X_line, y_line, 'black', linewidth=2)

# Set background color to blue-ish like in the original
ax2.set_facecolor("#DEE7F0")

ax2.set_xlabel('Petal Length (cm)', fontsize=16)
ax2.set_ylabel('Petal Width (cm)', fontsize=16)
ax2.set_title('Regression', fontsize=20, fontweight='bold')
ax2.grid(True, alpha=0.3, color='white')

# Adjust layout and display
plt.tight_layout()
plt.savefig('classification_regression_iris.png', dpi=300, bbox_inches='tight')
plt.show()

# Print some info about the models
print(f"Classification accuracy: {clf.score(X_class, y_class):.3f}")
print(f"Regression R² score: {reg.score(X_reg, y_reg):.3f}")

