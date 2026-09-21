# ============================================================
# HIMALAYAN EYE — INTERACTIVE RESEARCH DASHBOARD
# ============================================================

import streamlit as st
import pandas as pd
import numpy as np
import rasterio
import plotly.graph_objects as go
import plotly.express as px

from pathlib import Path


# ============================================================
# PAGE CONFIG
# ============================================================

st.set_page_config(
    page_title="Himalayan Eye | Research Dashboard",
    page_icon="🏔️",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

RESULTS_DIR = BASE_DIR / "results"
MAPS_DIR = RESULTS_DIR / "maps"
STATS_DIR = RESULTS_DIR / "statistics"

CSV_PATH = STATS_DIR / "final_results.csv"


# ============================================================
# GLOBAL CSS
# ============================================================

st.markdown(
    """
    <style>

    .stApp {
        background:
            radial-gradient(
                circle at 10% 0%,
                rgba(50, 100, 180, 0.14),
                transparent 30%
            ),
            radial-gradient(
                circle at 90% 100%,
                rgba(80, 130, 220, 0.10),
                transparent 35%
            ),
            #07111f;
    }

    .block-container {
        max-width: 1500px;
        padding-top: 1.2rem;
        padding-bottom: 3rem;
    }

    section[data-testid="stSidebar"] {
        background: #050d18;
        border-right: 1px solid rgba(255,255,255,0.08);
    }

    section[data-testid="stSidebar"] * {
        color: #dbe7f5;
    }

    h1, h2, h3, h4 {
        color: #f4f8ff !important;
    }

    p, li {
        color: #c5d0df !important;
        line-height: 1.7;
    }

    .stCaption {
        color: #7f95ad !important;
    }

    div[data-testid="stVerticalBlockBorderWrapper"] {
        border-color: rgba(130,180,255,0.16) !important;
        background: rgba(8,18,32,0.38);
    }

    div[data-testid="metric-container"] {
        background:
            linear-gradient(
                145deg,
                rgba(20,35,55,0.96),
                rgba(8,18,32,0.96)
            );

        border: 1px solid rgba(130,180,255,0.16);
        padding: 18px;
        border-radius: 14px;

        box-shadow:
            0 8px 30px rgba(0,0,0,0.22);

        transition:
            transform 0.2s ease,
            border-color 0.2s ease;
    }

    div[data-testid="metric-container"]:hover {
        transform: translateY(-3px);
        border-color: rgba(130,180,255,0.38);
    }

    div[data-testid="metric-container"] label {
        color: #91a4bb !important;
    }

    div[data-testid="metric-container"] div {
        color: #f5f9ff !important;
    }

    .stButton > button {
        border-radius: 10px;
        border: 1px solid rgba(120,180,255,0.25);
        background: rgba(20,40,65,0.8);
        color: #e8f2ff;
        transition: all 0.2s ease;
    }

    .stButton > button:hover {
        border-color: rgba(120,180,255,0.55);
        background: rgba(30,60,95,0.9);
        transform: translateY(-1px);
    }

    .stDownloadButton > button {
        border-radius: 10px;
        border: 1px solid rgba(100,170,255,0.28);
        background: rgba(18,38,64,0.85);
        color: #e8f2ff;
    }

    div[data-testid="stAlert"] {
        border-radius: 12px;
    }

    hr {
        border-color: rgba(255,255,255,0.08);
    }

    </style>
    """,
    unsafe_allow_html=True,
)


# ============================================================
# LOAD METRICS
# ============================================================

@st.cache_data
def load_metrics():

    if not CSV_PATH.exists():
        return {}

    df = pd.read_csv(CSV_PATH)

    output = {}

    for _, row in df.iterrows():

        name = row["metric"]
        value = row["value"]

        try:
            value = float(value)
        except (ValueError, TypeError):
            pass

        output[name] = value

    return output


metrics = load_metrics()


# ============================================================
# DATA CHECK
# ============================================================

if not CSV_PATH.exists():

    st.error("final_results.csv was not found.")

    st.code(str(CSV_PATH))

    st.stop()


# ============================================================
# RASTER LOADER
# ============================================================

@st.cache_data
def load_raster(path):

    with rasterio.open(path) as src:

        image = src.read(1)
        transform = src.transform
        bounds = src.bounds
        crs = src.crs

    return image, transform, bounds, crs


# ============================================================
# RASTER DOWNSAMPLING
# ============================================================

def downsample_raster(image, transform, factor):

    if factor <= 1:
        return image, transform

    return (
        image[::factor, ::factor],
        transform * rasterio.Affine.scale(factor, factor)
    )


# ============================================================
# RASTER COORDINATES
# ============================================================

def raster_coordinates(image, transform):

    rows, cols = image.shape

    x = (
        np.arange(cols) * transform.a
        + transform.c
        + transform.a / 2
    )

    y = (
        np.arange(rows) * transform.e
        + transform.f
        + transform.e / 2
    )

    return x, y


# ============================================================
# PLOT STYLE
# ============================================================

def dark_plot(fig, height=None):

    fig.update_layout(

        template="plotly_dark",

        paper_bgcolor="rgba(0,0,0,0)",

        plot_bgcolor="rgba(5,15,28,0.70)",

        font={
            "color": "#dbe7f5"
        },

        margin={
            "l": 50,
            "r": 35,
            "t": 75,
            "b": 50
        },

        hoverlabel={
            "bgcolor": "#101d2e",
            "font": {
                "color": "#ffffff"
            }
        },

        transition={
            "duration": 500
        }
    )

    if height:
        fig.update_layout(height=height)

    return fig


# ============================================================
# SIDEBAR
# ============================================================

st.sidebar.markdown(
    """
    # 🏔️ Himalayan Eye

    **Satellite Intelligence Console**
    """
)

st.sidebar.divider()

page = st.sidebar.radio(
    "NAVIGATION",
    [
        "🏠 Overview",
        "🗺️ Map Explorer",
        "❄️ Change Intelligence",
        "🤖 ML Lab",
        "🧪 Feature Analysis",
        "🛰️ Sensor Comparison",
        "🔬 Research Method",
    ]
)

st.sidebar.divider()

st.sidebar.markdown("### SYSTEM")

st.sidebar.success("● Analysis available")

st.sidebar.markdown("### DATA SOURCES")

st.sidebar.write(
    "🛰️ Landsat\n\n"
    "🛰️ Sentinel-2"
)

st.sidebar.markdown("### OBSERVATION YEARS")

st.sidebar.write(
    "2015  ·  2020  ·  2025"
)

st.sidebar.divider()

st.sidebar.markdown("### QUICK STATS")

st.sidebar.metric(
    "Study Region",
    f"{metrics['Study Region Area']:.2f} km²"
)

st.sidebar.metric(
    "ML Samples",
    "1,563"
)

st.sidebar.metric(
    "Spatial Accuracy",
    f"{metrics['Spatial Validation Accuracy']:.2f}%"
)

st.sidebar.divider()

st.sidebar.caption(
    "Himalayan Eye • Remote Sensing + Machine Learning"
)


# ============================================================
# HERO
# ============================================================

hero = st.container(border=True)

with hero:

    st.caption(
        "AI × REMOTE SENSING × EARTH OBSERVATION"
    )

    st.title("🏔️ Himalayan Eye")

    st.subheader(
        "AI-Based Snow/Ice Classification and Change Detection "
        "Using Multi-Sensor Satellite Imagery"
    )

    h1, h2, h3, h4 = st.columns(4)

    with h1:
        st.metric(
            "OBSERVATION YEARS",
            "2015 · 2020 · 2025"
        )

    with h2:
        st.metric(
            "ML SAMPLES",
            "1,563"
        )

    with h3:
        st.metric(
            "SPATIAL ACCURACY",
            f"{metrics['Spatial Validation Accuracy']:.2f}%"
        )

    with h4:
        st.success(
            "● ANALYSIS SYSTEM READY"
        )


# ============================================================
# OVERVIEW
# ============================================================

if page == "🏠 Overview":

    st.header("Mission Overview")

    st.write(
        "Himalayan Eye is a research-oriented machine learning "
        "workflow for classifying Snow/Ice, Rock/Bare Land, and "
        "Water from multi-temporal satellite imagery."
    )

    st.write(
        "The workflow combines spectral feature engineering, "
        "Random Forest classification, spatial validation, "
        "temporal comparison, and cross-sensor consistency analysis."
    )

    st.divider()

    st.subheader("📡 Research Stack")

    stack = st.columns(5)

    stack[0].info("🌍 Remote Sensing")
    stack[1].info("🤖 Random Forest")
    stack[2].info("❄️ NDSI")
    stack[3].info("🛰️ Landsat")
    stack[4].info("📡 Sentinel-2")

    st.divider()

    st.subheader("📊 Core Project Metrics")

    c1, c2, c3, c4 = st.columns(4)

    c1.metric(
        "2015 Snow/Ice",
        f"{metrics['2015 Snow/Ice Area']:.2f} km²"
    )

    c2.metric(
        "2020 Snow/Ice",
        f"{metrics['2020 Snow/Ice Area']:.2f} km²"
    )

    c3.metric(
        "2025 Snow/Ice",
        f"{metrics['2025 Snow/Ice Area']:.2f} km²"
    )

    c4.metric(
        "Spatial Accuracy",
        f"{metrics['Spatial Validation Accuracy']:.2f}%"
    )

    st.divider()

    # --------------------------------------------------------
    # DYNAMIC AREA EXPLORER
    # --------------------------------------------------------

    st.subheader("❄️ Dynamic Snow/Ice Area Explorer")

    chart_mode = st.radio(
        "Visualization",
        [
            "Line",
            "Bar",
            "Area"
        ],
        horizontal=True
    )

    years = [2015, 2020, 2025]

    areas = [
        metrics["2015 Snow/Ice Area"],
        metrics["2020 Snow/Ice Area"],
        metrics["2025 Snow/Ice Area"],
    ]

    fig = go.Figure()

    if chart_mode == "Line":

        fig.add_trace(
            go.Scatter(
                x=years,
                y=areas,
                mode="lines+markers",
                line=dict(width=4),
                marker=dict(size=13),
                name="Snow/Ice Area",
                hovertemplate=
                    "<b>%{x}</b><br>"
                    "Snow/Ice: %{y:.2f} km²"
                    "<extra></extra>",
            )
        )

    elif chart_mode == "Bar":

        fig.add_trace(
            go.Bar(
                x=years,
                y=areas,
                text=[f"{x:.2f}" for x in areas],
                textposition="outside",
                name="Snow/Ice Area",
                hovertemplate=
                    "<b>%{x}</b><br>"
                    "Snow/Ice: %{y:.2f} km²"
                    "<extra></extra>",
            )
        )

    else:

        fig.add_trace(
            go.Scatter(
                x=years,
                y=areas,
                mode="lines",
                fill="tozeroy",
                line=dict(width=3),
                name="Snow/Ice Area",
            )
        )

    fig.update_layout(
        title="Mapped Snow/Ice Area",
        xaxis_title="Observation Year",
        yaxis_title="Area (km²)",
        xaxis=dict(
            tickmode="array",
            tickvals=years
        )
    )

    st.plotly_chart(
        dark_plot(fig, 470),
        use_container_width=True
    )

    st.caption(
        "The project contains three observation years rather than "
        "a continuous annual time series."
    )

    st.divider()

    # --------------------------------------------------------
    # CHANGE SNAPSHOT
    # --------------------------------------------------------

    st.subheader("⚡ Change Snapshot")

    c1, c2, c3 = st.columns(3)

    c1.metric(
        "Snow/Ice Gain",
        f"{metrics['Snow/Ice Gain']:.2f} km²"
    )

    c2.metric(
        "Snow/Ice Loss",
        f"{metrics['Snow/Ice Loss']:.2f} km²"
    )

    c3.metric(
        "Net Transition Change",
        f"{metrics['Net Snow/Ice Transition Change']:.2f} km²"
    )

    st.info(
        "Mapped-area difference and transition-based net change "
        "describe different calculations and should not be "
        "treated as interchangeable."
    )

    st.divider()

    # --------------------------------------------------------
    # QUICK RESEARCH CARDS
    # --------------------------------------------------------

    st.subheader("🧠 Research Highlights")

    q1, q2, q3 = st.columns(3)

    with q1:

        st.metric(
            "NDSI Importance",
            f"{metrics['NDSI Relative Importance']:.2f}"
        )

        st.caption(
            "Relative feature-importance index."
        )

    with q2:

        st.metric(
            "NDSI Improvement",
            f"+{metrics['NDSI Accuracy Improvement']:.2f} pp"
        )

        st.caption(
            "Spatial-validation improvement from NDSI."
        )

    with q3:

        st.metric(
            "Sensor Agreement",
            f"{metrics['Landsat-Sentinel Agreement']:.2f}%"
        )

        st.caption(
            "Cross-sensor consistency, not ground truth."
        )

    st.divider()

    # --------------------------------------------------------
    # ARCHITECTURE
    # --------------------------------------------------------

    st.subheader("🧩 Project Architecture")

    st.code(
        """
Satellite Imagery
       │
       ▼
Spectral Features
       │
       ├── NDSI
       ├── NDVI
       └── NDWI
       │
       ▼
Random Forest
       │
       ▼
Classification
       │
       ├── Snow/Ice
       ├── Rock/Bare Land
       └── Water
       │
       ▼
Spatial Validation
       │
       ▼
Temporal Change Analysis
       │
       ▼
Cross-Sensor Consistency
        """,
        language="text"
    )


# ============================================================
# MAP EXPLORER
# ============================================================

elif page == "🗺️ Map Explorer":

    st.header("🗺️ Interactive Map Explorer")

    st.write(
        "Explore the classified raster outputs and the final "
        "2015 → 2025 Snow/Ice change product."
    )

    st.divider()

    # --------------------------------------------------------
    # MAP CONTROLS
    # --------------------------------------------------------

    st.subheader("🎛️ Map Controls")

    control1, control2, control3 = st.columns(3)

    with control1:

        selected_year = st.selectbox(
            "Observation Year",
            [2015, 2020, 2025],
            key="map_year"
        )

    with control2:

        display_mode = st.selectbox(
            "Display Mode",
            [
                "Classification",
                "Change Detection"
            ]
        )

    with control3:

        resolution = st.select_slider(
            "Raster Resolution",
            options=[
                "Full",
                "1/2",
                "1/4",
                "1/8"
            ],
            value="1/2"
        )

    factors = {
        "Full": 1,
        "1/2": 2,
        "1/4": 4,
        "1/8": 8
    }

    factor = factors[resolution]

    st.divider()

    # --------------------------------------------------------
    # CLASSIFICATION MAP
    # --------------------------------------------------------

    if display_mode == "Classification":

        classification_path = (
            MAPS_DIR
            / f"himalayan_eye_classification_{selected_year}.tif"
        )

        if classification_path.exists():

            image, transform, bounds, crs = load_raster(
                classification_path
            )

            image, transform = downsample_raster(
                image,
                transform,
                factor
            )

            x, y = raster_coordinates(
                image,
                transform
            )

            fig = go.Figure()

            fig.add_trace(
                go.Heatmap(

                    z=image,

                    x=x,
                    y=y,

                    zmin=0,
                    zmax=2,

                    colorscale=[
                        [0.00, "#f5f5f5"],
                        [0.49, "#f5f5f5"],
                        [0.50, "#8b7355"],
                        [0.74, "#8b7355"],
                        [0.75, "#3b82f6"],
                        [1.00, "#3b82f6"],
                    ],

                    colorbar=dict(
                        title="Class",
                        tickvals=[0, 1, 2],
                        ticktext=[
                            "Snow/Ice",
                            "Rock/Bare",
                            "Water"
                        ]
                    ),

                    hovertemplate=
                        "X: %{x:.2f}<br>"
                        "Y: %{y:.2f}<br>"
                        "Class: %{z}"
                        "<extra></extra>"
                )
            )

            fig.update_layout(
                title=f"Classification Map — {selected_year}",
                xaxis_title="Spatial Coordinate",
                yaxis_title="Spatial Coordinate",
                yaxis=dict(
                    scaleanchor="x",
                    scaleratio=1
                )
            )

            st.plotly_chart(
                dark_plot(fig, 700),
                use_container_width=True
            )

            st.success(
                f"Displaying {selected_year} classification raster "
                f"at {resolution.lower()} resolution."
            )

            if crs:
                st.caption(
                    f"Raster CRS: {crs}"
                )

            st.download_button(
                "⬇️ Download Classification GeoTIFF",
                data=classification_path.read_bytes(),
                file_name=classification_path.name,
                mime="image/tiff"
            )

        else:

            st.error(
                f"Classification map not found:\n"
                f"{classification_path}"
            )

    # --------------------------------------------------------
    # CHANGE MAP
    # --------------------------------------------------------

    else:

        change_path = (
            MAPS_DIR
            / "himalayan_eye_snow_ice_change_2015_2025.tif"
        )

        if change_path.exists():

            image, transform, bounds, crs = load_raster(
                change_path
            )

            image, transform = downsample_raster(
                image,
                transform,
                factor
            )

            x, y = raster_coordinates(
                image,
                transform
            )

            fig = go.Figure()

            fig.add_trace(
                go.Heatmap(

                    z=image,

                    x=x,
                    y=y,

                    zmin=0,
                    zmax=3,

                    colorscale=[
                        [0.00, "#8b8f94"],
                        [0.24, "#8b8f94"],
                        [0.25, "#ffffff"],
                        [0.49, "#ffffff"],
                        [0.50, "#ef4444"],
                        [0.74, "#ef4444"],
                        [0.75, "#3b82f6"],
                        [1.00, "#3b82f6"],
                    ],

                    colorbar=dict(
                        title="Change",
                        tickvals=[0, 1, 2, 3],
                        ticktext=[
                            "Other / No Snow",
                            "Stable Snow/Ice",
                            "Snow/Ice Loss",
                            "Snow/Ice Gain"
                        ]
                    ),

                    hovertemplate=
                        "X: %{x:.2f}<br>"
                        "Y: %{y:.2f}<br>"
                        "Change Class: %{z}"
                        "<extra></extra>"
                )
            )

            fig.update_layout(
                title="Snow/Ice Change — 2015 → 2025",
                xaxis_title="Spatial Coordinate",
                yaxis_title="Spatial Coordinate",
                yaxis=dict(
                    scaleanchor="x",
                    scaleratio=1
                )
            )

            st.plotly_chart(
                dark_plot(fig, 700),
                use_container_width=True
            )

            st.info(
                "White = stable Snow/Ice • Red = Snow/Ice loss • "
                "Blue = Snow/Ice gain • Gray = other/no Snow"
            )

            st.download_button(
                "⬇️ Download Final Change GeoTIFF",
                data=change_path.read_bytes(),
                file_name=change_path.name,
                mime="image/tiff"
            )

        else:

            st.error(
                f"Change map not found:\n{change_path}"
            )


# ============================================================
# CHANGE INTELLIGENCE
# ============================================================

elif page == "❄️ Change Intelligence":

    st.header("❄️ Change Intelligence")

    st.write(
        "Investigate mapped Snow/Ice area differences and "
        "class-to-class transitions."
    )

    st.divider()

    # --------------------------------------------------------
    # PERIOD SELECTOR
    # --------------------------------------------------------

    period = st.radio(
        "Analysis Period",
        [
            "2015 → 2020",
            "2020 → 2025",
            "2015 → 2025"
        ],
        horizontal=True
    )

    period_data = {

        "2015 → 2020": (
            2015,
            2020,
            metrics["2015 Snow/Ice Area"],
            metrics["2020 Snow/Ice Area"]
        ),

        "2020 → 2025": (
            2020,
            2025,
            metrics["2020 Snow/Ice Area"],
            metrics["2025 Snow/Ice Area"]
        ),

        "2015 → 2025": (
            2015,
            2025,
            metrics["2015 Snow/Ice Area"],
            metrics["2025 Snow/Ice Area"]
        )
    }

    start, end, start_area, end_area = period_data[period]

    difference = end_area - start_area

    c1, c2, c3 = st.columns(3)

    c1.metric(
        f"{start} Snow/Ice",
        f"{start_area:.2f} km²"
    )

    c2.metric(
        f"{end} Snow/Ice",
        f"{end_area:.2f} km²"
    )

    c3.metric(
        "Mapped Difference",
        f"{difference:+.2f} km²"
    )

    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            x=[
                str(start),
                str(end)
            ],
            y=[
                start_area,
                end_area
            ],
            text=[
                f"{start_area:.2f}",
                f"{end_area:.2f}"
            ],
            textposition="outside"
        )
    )

    fig.update_layout(
        title=f"Snow/Ice Area — {period}",
        yaxis_title="Area (km²)"
    )

    st.plotly_chart(
        dark_plot(fig, 430),
        use_container_width=True
    )

    st.divider()

    # --------------------------------------------------------
    # TRANSITION MATRIX
    # --------------------------------------------------------

    st.subheader("🔄 2015 → 2025 Transition Matrix")

    transition_matrix = np.array(
        [
            [25.72127, 0.32341, 1.20346],
            [1.52104, 7.48726, 2.53177],
            [3.98030, 0.90244, 3.88895]
        ]
    )

    transition_classes = [
        "Snow/Ice",
        "Rock/Bare",
        "Water"
    ]

    fig = px.imshow(
        transition_matrix,
        x=transition_classes,
        y=transition_classes,
        text_auto=".2f",
        aspect="auto"
    )

    fig.update_layout(
        title="Transition Area Matrix (km²)",
        xaxis_title="2025 Class",
        yaxis_title="2015 Class"
    )

    st.plotly_chart(
        dark_plot(fig, 520),
        use_container_width=True
    )

    st.caption(
        "Rows represent the 2015 class; columns represent the 2025 class."
    )

    st.divider()

    # --------------------------------------------------------
    # TRANSITION BAR CHART
    # --------------------------------------------------------

    st.subheader("📊 Transition Area Explorer")

    transition_labels = [

        "Snow → Snow",
        "Snow → Rock",
        "Snow → Water",

        "Rock → Snow",
        "Rock → Rock",
        "Rock → Water",

        "Water → Snow",
        "Water → Rock",
        "Water → Water"
    ]

    transition_values = [

        25.72127,
        0.32341,
        1.20346,

        1.52104,
        7.48726,
        2.53177,

        3.98030,
        0.90244,
        3.88895
    ]

    transition_df = pd.DataFrame(
        {
            "Transition": transition_labels,
            "Area (km²)": transition_values
        }
    )

    minimum_area = st.slider(
        "Minimum transition area to display",
        0.0,
        5.0,
        0.0,
        0.1
    )

    filtered = transition_df[
        transition_df["Area (km²)"] >= minimum_area
    ]

    fig = px.bar(
        filtered,
        x="Area (km²)",
        y="Transition",
        orientation="h",
        text="Area (km²)"
    )

    fig.update_traces(
        texttemplate="%{text:.2f}",
        textposition="outside"
    )

    fig.update_layout(
        title="Class-to-Class Transition Areas"
    )

    st.plotly_chart(
        dark_plot(fig, 560),
        use_container_width=True
    )

    st.divider()

    st.subheader("❄️ Snow/Ice Transition Summary")

    c1, c2, c3 = st.columns(3)

    c1.metric(
        "Stable Snow/Ice",
        f"{metrics['Stable Snow/Ice']:.2f} km²"
    )

    c2.metric(
        "Snow/Ice Loss",
        f"{metrics['Snow/Ice Loss']:.2f} km²"
    )

    c3.metric(
        "Snow/Ice Gain",
        f"{metrics['Snow/Ice Gain']:.2f} km²"
    )

    st.info(
        "Transition metrics use the common valid comparison area. "
        "They are different from the simple difference between "
        "total mapped Snow/Ice areas."
    )


# ============================================================
# ML LAB
# ============================================================

elif page == "🤖 ML Lab":

    st.header("🤖 Machine Learning Laboratory")

    st.write(
        "Inspect classifier performance under different "
        "validation strategies."
    )

    st.divider()

    validation = st.radio(
        "Validation Strategy",
        [
            "Random Holdout",
            "Spatial Validation"
        ],
        horizontal=True
    )

    if validation == "Random Holdout":

        accuracy = metrics["Random Holdout Accuracy"]
        kappa = metrics["Random Holdout Kappa"]

        matrix = np.array(
            [
                [167, 0, 0],
                [0, 101, 3],
                [0, 0, 28]
            ]
        )

        class_metrics = pd.DataFrame(
            {
                "Class": [
                    "Snow/Ice",
                    "Rock/Bare",
                    "Water"
                ],
                "Precision": [
                    1.000,
                    101 / 104,
                    1.000
                ],
                "Recall": [
                    1.000,
                    101 / 101,
                    28 / 28
                ]
            }
        )

    else:

        accuracy = metrics["Spatial Validation Accuracy"]
        kappa = metrics["Spatial Validation Kappa"]

        matrix = np.array(
            [
                [406, 0, 0],
                [0, 257, 21],
                [0, 4, 100]
            ]
        )

        class_metrics = pd.DataFrame(
            {
                "Class": [
                    "Snow/Ice",
                    "Rock/Bare",
                    "Water"
                ],
                "Precision": [
                    1.000,
                    0.9846743,
                    0.8264463
                ],
                "Recall": [
                    1.000,
                    0.9244604,
                    0.9615385
                ],
                "F1": [
                    1.000,
                    0.9536178,
                    0.8888889
                ]
            }
        )

    c1, c2, c3 = st.columns(3)

    c1.metric(
        "Accuracy",
        f"{accuracy:.3f}%"
    )

    c2.metric(
        "Cohen's Kappa",
        f"{kappa:.3f}"
    )

    c3.metric(
        "Validation Samples",
        "299" if validation == "Random Holdout" else "788"
    )

    st.divider()

    st.subheader("🧮 Confusion Matrix")

    labels = [
        "Snow/Ice",
        "Rock/Bare",
        "Water"
    ]

    fig = px.imshow(
        matrix,
        x=labels,
        y=labels,
        text_auto=True,
        aspect="auto"
    )

    fig.update_layout(
        title=f"{validation} Confusion Matrix",
        xaxis_title="Predicted Class",
        yaxis_title="Actual Class"
    )

    st.plotly_chart(
        dark_plot(fig, 500),
        use_container_width=True
    )

    st.caption(
        "Rows represent actual classes; columns represent predicted classes."
    )

    st.divider()

    st.subheader("📋 Class-Level Performance")

    st.dataframe(
        class_metrics.style.format(
            {
                "Precision": "{:.3f}",
                "Recall": "{:.3f}",
                "F1": "{:.3f}"
            }
        ),
        use_container_width=True,
        hide_index=True
    )

    st.divider()

    st.subheader("⚔️ Validation Strategy Comparison")

    comparison_df = pd.DataFrame(
        {
            "Validation": [
                "Random Holdout",
                "Spatial Validation"
            ],
            "Accuracy": [
                metrics["Random Holdout Accuracy"],
                metrics["Spatial Validation Accuracy"]
            ],
            "Kappa": [
                metrics["Random Holdout Kappa"],
                metrics["Spatial Validation Kappa"]
            ]
        }
    )

    fig = px.bar(
        comparison_df,
        x="Validation",
        y="Accuracy",
        text="Accuracy"
    )

    fig.update_traces(
        texttemplate="%{text:.2f}%",
        textposition="outside"
    )

    fig.update_layout(
        title="Validation Accuracy Comparison",
        yaxis_title="Accuracy (%)"
    )

    st.plotly_chart(
        dark_plot(fig, 430),
        use_container_width=True
    )

    st.info(
        "Spatial validation is the more conservative assessment "
        "because training and validation samples are spatially separated."
    )


# ============================================================
# FEATURE ANALYSIS
# ============================================================

elif page == "🧪 Feature Analysis":

    st.header("🧪 Feature Intelligence")

    st.write(
        "Explore the contribution of spectral indices and "
        "the effect of removing NDSI."
    )

    st.divider()

    features = [
        "NDSI",
        "NDVI",
        "NDWI"
    ]

    importance = [
        metrics["NDSI Relative Importance"],
        metrics["NDVI Relative Importance"],
        metrics["NDWI Relative Importance"]
    ]

    feature_df = pd.DataFrame(
        {
            "Feature": features,
            "Relative Importance": importance
        }
    )

    selected_features = st.multiselect(
        "Select features to display",
        features,
        default=features
    )

    filtered_features = feature_df[
        feature_df["Feature"].isin(selected_features)
    ]

    fig = px.bar(
        filtered_features,
        x="Feature",
        y="Relative Importance",
        text="Relative Importance"
    )

    fig.update_traces(
        texttemplate="%{text:.2f}",
        textposition="outside"
    )

    fig.update_layout(
        title="Relative Importance of Spectral Indices",
        yaxis_title="Relative Importance",
        xaxis_title="Feature"
    )

    st.plotly_chart(
        dark_plot(fig, 450),
        use_container_width=True
    )

    st.caption(
        "Feature-importance values are relative indices, not percentages."
    )

    st.divider()

    st.subheader("🧪 NDSI Ablation Study")

    c1, c2, c3 = st.columns(3)

    c1.metric(
        "With NDSI",
        f"{metrics['Spatial Validation Accuracy']:.2f}%"
    )

    c2.metric(
        "Without NDSI",
        f"{metrics['Spatial Accuracy Without NDSI']:.2f}%"
    )

    c3.metric(
        "Improvement",
        f"+{metrics['NDSI Accuracy Improvement']:.2f} pp"
    )

    ablation_df = pd.DataFrame(
        {
            "Model": [
                "Without NDSI",
                "With NDSI"
            ],
            "Spatial Accuracy": [
                metrics["Spatial Accuracy Without NDSI"],
                metrics["Spatial Validation Accuracy"]
            ]
        }
    )

    fig = px.bar(
        ablation_df,
        x="Model",
        y="Spatial Accuracy",
        text="Spatial Accuracy"
    )

    fig.update_traces(
        texttemplate="%{text:.2f}%",
        textposition="outside"
    )

    fig.update_layout(
        title="NDSI Ablation",
        yaxis_title="Spatial Validation Accuracy (%)"
    )

    st.plotly_chart(
        dark_plot(fig, 430),
        use_container_width=True
    )

    st.success(
        f"NDSI contributes a measured +{metrics['NDSI Accuracy Improvement']:.2f} "
        "percentage-point improvement in spatial validation accuracy."
    )


# ============================================================
# SENSOR COMPARISON
# ============================================================

elif page == "🛰️ Sensor Comparison":

    st.header("🛰️ Multi-Sensor Consistency")

    st.write(
        "Compare Landsat and Sentinel-2 classifications over "
        "their common valid area."
    )

    st.divider()

    agreement = metrics[
        "Landsat-Sentinel Agreement"
    ]

    disagreement = 100 - agreement

    comparison_area = metrics[
        "Common Valid Comparison Area"
    ]

    c1, c2, c3 = st.columns(3)

    c1.metric(
        "Agreement",
        f"{agreement:.2f}%"
    )

    c2.metric(
        "Disagreement",
        f"{disagreement:.2f}%"
    )

    c3.metric(
        "Comparison Area",
        f"{comparison_area:.2f} km²"
    )

    st.divider()

    chart_type = st.radio(
        "Consistency Visualization",
        [
            "Donut",
            "Bar"
        ],
        horizontal=True
    )

    if chart_type == "Donut":

        fig = go.Figure(
            data=[
                go.Pie(
                    labels=[
                        "Agreement",
                        "Disagreement"
                    ],
                    values=[
                        agreement,
                        disagreement
                    ],
                    hole=0.60,
                    textinfo="label+percent",
                    hovertemplate=
                        "%{label}: %{value:.2f}%"
                        "<extra></extra>"
                )
            ]
        )

    else:

        sensor_df = pd.DataFrame(
            {
                "Category": [
                    "Agreement",
                    "Disagreement"
                ],
                "Percentage": [
                    agreement,
                    disagreement
                ]
            }
        )

        fig = px.bar(
            sensor_df,
            x="Category",
            y="Percentage",
            text="Percentage"
        )

        fig.update_traces(
            texttemplate="%{text:.2f}%",
            textposition="outside"
        )

        fig.update_layout(
            yaxis_title="Percentage"
        )

    fig.update_layout(
        title="Landsat–Sentinel Classification Consistency"
    )

    st.plotly_chart(
        dark_plot(fig, 470),
        use_container_width=True
    )

    st.warning(
        "This is a cross-sensor consistency measure, not "
        "ground-truth classification accuracy."
    )

    st.divider()

    st.subheader("📐 Comparison Area")

    agreement_area = 42.118134
    disagreement_area = 7.613571

    area_df = pd.DataFrame(
        {
            "Category": [
                "Agreement",
                "Disagreement"
            ],
            "Area (km²)": [
                agreement_area,
                disagreement_area
            ]
        }
    )

    fig = px.bar(
        area_df,
        x="Category",
        y="Area (km²)",
        text="Area (km²)"
    )

    fig.update_traces(
        texttemplate="%{text:.2f}",
        textposition="outside"
    )

    fig.update_layout(
        title="Agreement vs Disagreement Area"
    )

    st.plotly_chart(
        dark_plot(fig, 430),
        use_container_width=True
    )

    st.divider()

    st.subheader("🔍 Consistency Interpretation")

    i1, i2 = st.columns(2)

    with i1:

        st.info(
            f"{agreement:.2f}% of the common comparison area "
            "received matching classifications between the "
            "two sensor workflows."
        )

    with i2:

        st.info(
            f"{disagreement:.2f}% of the common comparison area "
            "received different classifications."
        )


# ============================================================
# RESEARCH METHOD
# ============================================================

elif page == "🔬 Research Method":

    st.header("🔬 Research Architecture")

    st.write(
        "Himalayan Eye integrates satellite imagery, spectral "
        "feature engineering, machine learning, validation, "
        "temporal comparison, and cross-sensor analysis."
    )

    st.divider()

    st.subheader("🧬 End-to-End Pipeline")

    stages = [

        (
            "01",
            "Satellite Imagery",
            "Landsat / Sentinel-2"
        ),

        (
            "02",
            "Spectral Features",
            "NDSI / NDVI / NDWI"
        ),

        (
            "03",
            "Training Samples",
            "Labeled Samples"
        ),

        (
            "04",
            "Random Forest",
            "Land-Cover Classes"
        ),

        (
            "05",
            "Spatial Validation",
            "Validation Metrics"
        ),

        (
            "06",
            "Change Detection",
            "Snow/Ice Change"
        ),

        (
            "07",
            "Cross-Sensor Analysis",
            "Consistency Assessment"
        )
    ]

    for number, stage, output in stages:

        with st.expander(
            f"{number}  •  {stage}"
        ):

            st.write(
                f"**Output:** {output}"
            )

            if stage == "Satellite Imagery":

                st.write(
                    "Multi-temporal satellite observations form "
                    "the primary input to the classification workflow."
                )

            elif stage == "Spectral Features":

                st.write(
                    "Spectral bands are combined with NDSI, NDVI, "
                    "and NDWI to provide physically meaningful "
                    "feature information."
                )

            elif stage == "Training Samples":

                st.write(
                    "The model uses 1,563 labeled samples."
                )

            elif stage == "Random Forest":

                st.write(
                    "Random Forest performs multi-class classification "
                    "into Snow/Ice, Rock/Bare Land, and Water."
                )

            elif stage == "Spatial Validation":

                st.write(
                    "Spatially separated samples provide a more "
                    "conservative assessment of generalization."
                )

            elif stage == "Change Detection":

                st.write(
                    "Classified maps are compared between observation "
                    "years to quantify mapped Snow/Ice transitions."
                )

            else:

                st.write(
                    "Landsat and Sentinel-2 classifications are compared "
                    "over their common valid area."
                )

    st.divider()

    st.subheader("🛰️ Dataset Summary")

    d1, d2, d3, d4 = st.columns(4)

    d1.metric(
        "Landsat Years",
        "3"
    )

    d2.metric(
        "Sentinel-2 Images",
        "11"
    )

    d3.metric(
        "ML Samples",
        "1,563"
    )

    d4.metric(
        "Study Region",
        f"{metrics['Study Region Area']:.2f} km²"
    )

    st.divider()

    st.subheader("📚 Reproducibility")

    reproducibility = pd.DataFrame(
        {
            "Component": [
                "Satellite Processing",
                "Machine Learning",
                "Validation",
                "Change Analysis",
                "Cross-Sensor Analysis"
            ],

            "Method": [
                "Google Earth Engine",
                "Random Forest",
                "Random + Spatial",
                "2015 / 2020 / 2025",
                "Landsat vs Sentinel-2"
            ]
        }
    )

    st.dataframe(
        reproducibility,
        use_container_width=True,
        hide_index=True
    )

    st.divider()

    st.subheader("⚠️ Research Limitations")

    with st.expander("Read limitations"):

        st.markdown(
            """
            - The analysis uses selected observation years rather than
              a continuous annual time series.

            - Acquisition timing, seasonality, clouds, and atmospheric
              conditions can affect classification.

            - Sensor differences can influence cross-sensor agreement.

            - The common comparison area is smaller than the full
              study region.

            - Observed changes are not assigned a causal explanation.

            - Snow/Ice mapped-area change should not be interpreted as
              glacier mass balance or direct glacier-retreat measurement.
            """
        )


# ============================================================
# GLOBAL DOWNLOAD CENTER
# ============================================================

st.divider()

st.subheader("📦 Research Output Center")

download1, download2, download3 = st.columns(3)

with download1:

    st.download_button(
        "⬇️ Download Results CSV",
        data=CSV_PATH.read_bytes(),
        file_name="final_results.csv",
        mime="text/csv"
    )

with download2:

    map_2025 = (
        MAPS_DIR
        / "himalayan_eye_classification_2025.tif"
    )

    if map_2025.exists():

        st.download_button(
            "🗺️ Download 2025 Map",
            data=map_2025.read_bytes(),
            file_name=map_2025.name,
            mime="image/tiff"
        )

with download3:

    final_change = (
        MAPS_DIR
        / "himalayan_eye_snow_ice_change_2015_2025.tif"
    )

    if final_change.exists():

        st.download_button(
            "❄️ Download Change Map",
            data=final_change.read_bytes(),
            file_name=final_change.name,
            mime="image/tiff"
        )


# ============================================================
# FOOTER
# ============================================================

st.divider()

st.markdown(
    """
    ### 🏔️ Himalayan Eye

    **AI × Remote Sensing × Multi-Sensor Satellite Analysis**

    *Research-oriented machine learning dashboard*
    """
)

st.caption(
    "Himalayan Eye • Multi-temporal satellite classification • "
    "Random Forest • Spatial Validation"
)