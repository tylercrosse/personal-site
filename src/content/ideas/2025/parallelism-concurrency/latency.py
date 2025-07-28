# %%

import matplotlib.pyplot as plt
import numpy as np

# Component data: (name, latency_s, bandwidth_GBps, (x_offset, y_offset))
components_data = [
    ("L1 Cache", 1e-9, 1000, (5, 5)),
    ("L2 Cache", 4e-9, 500, (5, 5)),
    ("L3 Cache", 13e-9, 250, (5, 5)),
    ("DDR5 DRAM", 80e-9, 75, (5, 5)),
    ("PCIe 4x4", 150e-9, 8, (5, -15)),
    ("PCIe 4x16", 150e-9, 32, (5, 5)),
    ("PCIe 5x4", 150e-9, 16, (5, 5)),
    ("PCIe 5x16", 150e-9, 64, (5, -15)),
    ("NVMe (Gen4)", 50e-6, 6.8, (5, 5)),
    ("SATA SSD", 150e-6, 0.5, (5, -15)),
    ("HDD 7200 RPM", 7.5e-3, 0.15, (5, 5)),
    ("1 GbE", 50e-6, 0.125, (5, 5)),
    ("10 GbE", 30e-6, 1.25, (5, 5)),
    ("Wi-Fi 5", 3e-3, 0.5, (5, -15)),
    ("Wi-Fi 6", 2e-3, 1.0, (5, -15)),
    ("Datacenter RTT", 500e-6, 1.25, (5, 5)),
    ("Cross-US RTT", 70e-3, 0.125, (5, -20)),
    ("Trans-Atlantic RTT", 150e-3, 0.125, (5, 5)),
]

# Extract data into arrays for plotting
components = [item[0] for item in components_data]
latency_s = np.array([item[1] for item in components_data])
bandwidth_GBps = np.array([item[2] for item in components_data])
offsets = [item[3] for item in components_data]

plt.figure(figsize=(12, 8))
plt.scatter(
    latency_s, bandwidth_GBps, s=60, alpha=0.85, edgecolors="k", color="#1754b5"
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
plt.xlabel("Latency (seconds)", fontsize=18)
plt.ylabel("Bandwidth (GB/s)", fontsize=18)
plt.title("Bandwidth vs Latency", fontsize=20)
plt.grid(which="both", linestyle="--", alpha=0.5)
plt.tick_params(axis="both", which="major", labelsize=16)
plt.tight_layout()
plt.show()
