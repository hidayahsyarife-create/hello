"""NEON GENESIS — THE LAST SIGNAL
blender/export_assets.py — batch GLB export orchestrator.

Run:
    blender -b -P blender/export_assets.py            # default output
    blender -b -P blender/export_assets.py -- --out /path/to/assets/models

Produces one GLB per asset into assets/models/:
    robot.glb  vehicle.glb  facility_kit.glb

GLB units match the Three.js world scale (1 unit = 1 m), +Y forward,
Z up — no post-import transform needed by src/three/models.js.
"""

import argparse
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_assets  # noqa: E402


def export_collection(col, filepath):
    # export only the objects of this collection (hierarchy via glTF exporter)
    bpy.context.window.scene = bpy.context.scene
    bpy.ops.object.select_all(action="DESELECT")
    for obj in col.all_objects:
        if obj.type in {"MESH", "EMPTY"}:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = next(
        o for o in col.all_objects if o.type == "EMPTY")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        use_selection=True,
        export_format="GLB",
        export_apply=True,
        export_animations=False,
        export_yup=True,          # glTF up-axis for Three.js
    )
    print(f"  exported {filepath} ({col.name}, {len(col.all_objects)} objects)")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "assets", "models"))
    args = ap.parse_args(argv)

    os.makedirs(args.out, exist_ok=True)
    generate_assets.clear_scene()

    print("NEON GENESIS — building Blender assets")
    for name, builder in generate_assets.BUILDERS.items():
        bpy.ops.object.select_all(action="DESELECT")
        root, col = builder()
        export_collection(col, os.path.join(args.out, f"{name}.glb"))
        # keep scene clean between assets
        generate_assets.clear_scene()
    print("done.")


if __name__ == "__main__":
    main()
