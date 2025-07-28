# %%

import matplotlib.pyplot as plt
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from matplotlib.ticker import FuncFormatter

# Component data: (name, latency_s, bandwidth_GBps, (x_offset, y_offset))
# Use tuples (min, max) for ranges, single values for fixed values
components_data = [
    ("L1 Cache", (0.5e-9, 1.5e-9), (800, 1200), (5, 5)),
    ("L2 Cache", (3e-9, 6e-9), (400, 600), (5, 5)),
    ("L3 Cache", (10e-9, 20e-9), (200, 300), (5, 5)),
    ("DDR5 DRAM", (60e-9, 100e-9), (50, 100), (5, 5)),
    # ("PCIe 4x4", 150e-9, 8, (5, -15)),
    ("PCIe 4x16", (100e-9, 200e-9), 32, (5, -15)),
    # ("PCIe 5x4", 150e-9, 16, (5, 5)),
    ("PCIe 5x16", (100e-9, 200e-9), 64, (5, -15)),
    ("NVMe (Gen4)", (20e-6, 100e-6), (3, 7), (5, 5)),
    ("SATA SSD", (50e-6, 300e-6), (0.3, 0.6), (5, -15)),
    ("HDD 7200 RPM", (5e-3, 15e-3), (0.1, 0.2), (5, 10)),
    ("1 GbE", (30e-6, 100e-6), 0.125, (5, 5)),
    ("10 GbE", (10e-6, 50e-6), 1.25, (5, 5)),
    ("Wi-Fi 5", (1e-3, 10e-3), (0.2, 0.6), (5, -15)),
    ("Wi-Fi 6", (0.5e-3, 5e-3), (0.5, 1.2), (5, -15)),
    ("Datacenter RTT", (100e-6, 1e-3), 1.25, (5, 5)),
    ("Cross-US RTT", (40e-3, 100e-3), 0.125, (5, -20)),
    ("Trans-Atlantic RTT", (80e-3, 200e-3), 0.125, (5, 5)),
]

def extract_value_and_error(data_point):
    """Extract center value and error bars from data point (could be single value or range)"""
    if isinstance(data_point, tuple):
        min_val, max_val = data_point
        center = (min_val + max_val) / 2
        error = (max_val - min_val) / 2
        return center, error
    else:
        return data_point, 0

def format_range_text(data_point, unit=""):
    """Format data point as text for hover info"""
    if isinstance(data_point, tuple):
        min_val, max_val = data_point
        return f"{min_val:.2e} - {max_val:.2e} {unit}"
    else:
        return f"{data_point:.2e} {unit}"

def format_latency_tick(x, pos):
    """Format latency ticks with appropriate units"""
    if x >= 1:
        return f"{x:.0f}s"
    elif x >= 1e-3:
        return f"{x*1e3:.0f}ms"
    elif x >= 1e-6:
        return f"{x*1e6:.0f}μs"
    elif x >= 1e-9:
        return f"{x*1e9:.0f}ns"
    else:
        return f"{x:.1e}s"

def format_bandwidth_tick(x, pos):
    """Format bandwidth ticks with appropriate units"""
    if x >= 1000:
        return f"{x/1000:.0f}TB/s"
    elif x >= 1:
        return f"{x:.0f}GB/s"
    elif x >= 1e-3:
        return f"{x*1e3:.0f}MB/s"
    elif x >= 1e-6:
        return f"{x*1e6:.0f}KB/s"
    else:
        return f"{x*1e9:.0f}B/s"

# Extract data into arrays for plotting
components = [item[0] for item in components_data]
latency_centers, latency_errors = zip(*[extract_value_and_error(item[1]) for item in components_data])
bandwidth_centers, bandwidth_errors = zip(*[extract_value_and_error(item[2]) for item in components_data])
offsets = [item[3] for item in components_data]

latency_s = np.array(latency_centers)
bandwidth_GBps = np.array(bandwidth_centers)
latency_err = np.array(latency_errors)
bandwidth_err = np.array(bandwidth_errors)

# Matplotlib version
plt.figure(figsize=(12, 8))

# Plot with error bars
plt.errorbar(
    latency_s, bandwidth_GBps, 
    xerr=latency_err, yerr=bandwidth_err,
    fmt='o', markersize=8, alpha=0.85, 
    markeredgecolor='k', markerfacecolor='#1754b5',
    ecolor='gray', elinewidth=1.5, capsize=3
)

# Annotate points with manual positioning
for i, comp in enumerate(components):
    plt.annotate(
        comp,
        (latency_s[i], bandwidth_GBps[i]),
        textcoords="offset points",
        xytext=offsets[i],
        fontsize=14,
        # bbox=dict(
        #     boxstyle="round,pad=0.3",
        #     facecolor="white",
        #     alpha=0.8,
        #     edgecolor="gray",
        #     linewidth=0.5,
        # ),
        ha="left" if offsets[i][0] > 0 else "right",
    )

plt.xscale("log")
plt.yscale("log")

# Apply custom tick formatting
plt.gca().xaxis.set_major_formatter(FuncFormatter(format_latency_tick))
plt.gca().yaxis.set_major_formatter(FuncFormatter(format_bandwidth_tick))

plt.xlabel("Latency", fontsize=18)
plt.ylabel("Bandwidth", fontsize=18)
plt.title("Bandwidth vs Latency", fontsize=20)
plt.grid(which="both", linestyle="--", alpha=0.5)
plt.tick_params(axis="both", which="major", labelsize=16)
plt.tight_layout()
plt.show()

# %% Plotly Interactive Version

# Create hover text with detailed information
hover_text = []
for i, item in enumerate(components_data):
    name, lat_data, bw_data, _ = item
    lat_text = format_range_text(lat_data, "s")
    bw_text = format_range_text(bw_data, "GB/s")
    hover_text.append(f"<b>{name}</b><br>Latency: {lat_text}<br>Bandwidth: {bw_text}")

# Create the plotly figure
fig = go.Figure()

# Add scatter plot with error bars
fig.add_trace(go.Scatter(
    x=latency_s,
    y=bandwidth_GBps,
    error_x=dict(type='data', array=latency_err, visible=True, color='gray', thickness=2),
    error_y=dict(type='data', array=bandwidth_err, visible=True, color='gray', thickness=2),
    mode='markers+text',
    marker=dict(
        size=12,
        color='#1754b5',
        line=dict(width=2, color='black')
    ),
    text=components,
    textposition='top right',
    textfont=dict(size=12, color='black'),
    hovertemplate='%{hovertext}<extra></extra>',
    hovertext=hover_text,
    name='Components'
))

# Update layout
fig.update_layout(
    title=dict(
        text="Bandwidth vs Latency (Interactive)",
        font=dict(size=24),
        x=0.5
    ),
    xaxis=dict(
        title="Latency (seconds)",
        type="log",
        showgrid=True,
        gridwidth=1,
        gridcolor='lightgray',
        title_font=dict(size=18),
        tickfont=dict(size=14)
    ),
    yaxis=dict(
        title="Bandwidth (GB/s)",
        type="log",
        showgrid=True,
        gridwidth=1,
        gridcolor='lightgray',
        title_font=dict(size=18),
        tickfont=dict(size=14)
    ),
    width=1000,
    height=700,
    showlegend=False,
    plot_bgcolor='white',
    hovermode='closest'
)

# Show the interactive plot
fig.show()

# Save as HTML for blog post
fig.write_html("bandwidth_vs_latency_interactive.html")
