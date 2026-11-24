"""NEON GENESIS — THE LAST SIGNAL
blender/generate_assets.py — procedural 3D asset builders (Phase 2).

Run with:
    blender -b -P blender/export_assets.py

This module only defines pure bpy builder functions; orchestrating and
exporting live in export_assets.py. Every builder is deterministic and
returns the top-level object so the exporter can collect hierarchies
into named collections before a single GLB export per asset.

Materials follow the PBR contract used by the Three.js side:
    hull      dark metal, roughness 0.35, metallic 0.85
    panel     mid armor, roughness 0.55, metallic 0.35
    energy    emissive blue, emission 0.9 strength (drives energize shots)
    concrete  grey rough 0.95 (facility)

Scale: robot ≈ 4.3 m tall, vehicle ≈ 5.6 m long — matching the camera
keyframes in src/camera.js.
"""

import bpy
import math
import random


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def make_collection(name, objects):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    for obj in objects:
        for user_col in list(obj.users_collection):
            user_col.objects.unlink(obj)
        col.objects.link(obj)
    return col


def mat_hull():
    m = bpy.data.materials.new("hull_dark")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.055, 0.065, 0.09, 1)
    bsdf.inputs["Roughness"].default_value = 0.35
    bsdf.inputs["Metallic"].default_value = 0.85
    return m


def mat_panel():
    m = bpy.data.materials.new("panel_armor")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.16, 0.19, 0.24, 1)
    bsdf.inputs["Roughness"].default_value = 0.55
    bsdf.inputs["Metallic"].default_value = 0.35
    return m


def mat_energy():
    m = bpy.data.materials.new("energy_blue")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.05, 0.15, 0.3, 1)
    bsdf.inputs["Emission Color"].default_value = (0.35, 0.7, 1.0, 1)
    # Blender pre-4.0 name fallback
    if "Emission" in bsdf.inputs:
        bsdf.inputs["Emission"].default_value = 6.0
    bsdf.inputs["Roughness"].default_value = 0.2
    return m


def mat_concrete():
    m = bpy.data.materials.new("concrete")
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.13, 0.14, 0.15, 1)
    bsdf.inputs["Roughness"].default_value = 0.95
    bsdf.inputs["Metallic"].default_value = 0.0
    return m


def box(name, size, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    obj.data.materials.append(mat)
    return obj


def cyl(name, radius, depth, loc, rot=(0, 0, 0), mat=None, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth,
                                        location=loc, rotation=rot, vertices=verts)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def sphere(name, radius, loc, mat, segs=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=segs)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return obj


# --------------------------------------------------------------------------
# ROBOT — dormant mech, ~4.3 m, origin at ground between the feet
# --------------------------------------------------------------------------

def make_robot_part(name, size, loc, material):
    return box(name, size, loc, material)


def build_robot(rng_seed=2077):
    rng = random.Random(rng_seed)
    hull, panel, energy = mat_hull(), mat_panel(), mat_energy()
    parts = []

    # legs (dormant, slightly offset stance)
    for side, sx in (('L', -1), ('R', 1)):
        make_robot_part(f"robot_thigh_{side}", (0.34, 0.34, 0.8),
                        (sx * 0.30, 0, 1.25), hull)
        make_robot_part(f"robot_shin_{side}", (0.30, 0.30, 0.8),
                        (sx * 0.30 + 0.03 * side, 0.05, 0.5), panel)
        make_robot_part(f"robot_foot_{side}", (0.44, 0.7, 0.2),
                        (sx * 0.30 + 0.03 * side, 0.12, 0.1), hull)
        parts.append(make_robot_part(f"robot_leg_energy_{side}",
                                     (0.08, 0.34, 0.7), (sx * 0.30 + 0.05 * side, 0.18, 0.88), energy))

    # pelvis + torso
    parts.append(make_robot_part("robot_pelvis", (0.9, 0.5, 0.34), (0, 0, 1.78), hull))
    parts.append(make_robot_part("robot_chest", (1.5, 0.7, 0.8), (0, 0, 2.45), panel))
    parts.append(make_robot_part("robot_abdomen", (0.7, 0.45, 0.34), (0, 0, 2.0), hull))
    # chest core + spine energy channel
    parts.append(sphere("robot_core", 0.18, (0, 0.34, 2.5), energy))
    parts.append(make_robot_part("robot_spine_energy", (0.1, 0.2, 0.7), (0, 0.36, 2.2), energy))

    # shoulders + arms (hanging, dormant)
    for side, sx in (('L', -1), ('R', 1)):
        parts.append(sphere(f"robot_shoulder_{side}", 0.26,
                            (sx * 0.95, 0, 2.7), hull))
        parts.append(make_robot_part(f"robot_upperarm_{side}", (0.24, 0.24, 0.7),
                                     (sx * 1.02, 0, 2.2), hull))
        parts.append(sphere(f"robot_elbow_{side}", 0.16,
                            (sx * 1.05, 0, 1.85), panel))
        parts.append(make_robot_part(f"robot_forearm_{side}", (0.2, 0.2, 0.6),
                                     (sx * 1.06, 0.02, 1.5), panel))
        parts.append(make_robot_part(f"robot_hand_{side}", (0.24, 0.26, 0.2),
                                     (sx * 1.06, 0.04, 1.12), hull))
        parts.append(make_robot_part(f"robot_arm_energy_{side}",
                                     (0.07, 0.2, 0.6), (sx * 1.14, 0.12, 1.85), energy))

    # head: box skull + visor slit
    head = make_robot_part("robot_head", (0.56, 0.6, 0.42), (0, 0.02, 3.35), hull)
    parts.append(head)
    parts.append(make_robot_part("robot_visor", (0.42, 0.06, 0.1), (0, 0.31, 3.4), energy))
    parts.append(make_robot_part("robot_neck", (0.2, 0.2, 0.2), (0, 0, 3.05), panel))

    # backpack actuators
    for i, sx in enumerate((-0.3, 0.3)):
        parts.append(cyl(f"robot_actuator_{i}", 0.12, 0.6,
                         (sx, -0.4, 2.5), rot=(math.radians(20), 0, 0), mat=hull))

    # parent everything under a root for a clean single-object export
    root = bpy.data.objects.new("robot_root", None)
    bpy.context.scene.collection.objects.link(root)
    root.location = (0, 0, 0)
    for p in parts:
        p.parent = root
    col = make_collection("ROBOT", [root] + parts)
    return root, col


# --------------------------------------------------------------------------
# VEHICLE — civilian flying craft, ~5.6 m long, faces +Y motion line
# --------------------------------------------------------------------------

def build_vehicle(seed=99):
    rng = random.Random(seed)
    hull, panel, energy = mat_hull(), mat_panel(), mat_energy()
    parts = []

    parts.append(box("veh_hull", (1.2, 4.6, 0.6), (0, 0, 0.6), hull))
    parts.append(box("veh_keel", (0.7, 3.4, 0.3), (0, 0.0, 0.25), panel))
    nose = bpy.ops.mesh.primitive_cone_add(radius1=0.5, depth=1.6,
                                           location=(0, 2.9, 0.6),
                                           rotation=(math.radians(90), 0, 0))
    nose_obj = bpy.context.active_object
    nose_obj.name = "veh_nose"
    nose_obj.data.materials.append(hull)
    parts.append(nose_obj)
    canopy = sphere("veh_canopy", 0.42, (0, 0.6, 1.02), panel, segs=20)
    canopy.scale = (0.9, 1.6, 0.6)
    parts.append(canopy)

    for side, sx in (('L', -1), ('R', 1)):
        parts.append(cyl(f"veh_pylon_{side}", 0.1, 1.1,
                         (sx * 0.75, -0.4, 0.75), rot=(0, math.radians(90), 0), mat=hull))
        parts.append(cyl(f"veh_engine_{side}", 0.3, 1.4,
                         (sx * 1.35, -0.4, 0.75), rot=(0, math.radians(90), 0), mat=panel))
        parts.append(cyl(f"veh_thrust_{side}", 0.22, 0.12,
                         (sx * 1.35, -1.15, 0.75), rot=(0, math.radians(90), 0), mat=energy))
        parts.append(sphere(f"veh_nav_{side}", 0.07, (sx * 0.6, 0.9, 0.95), energy, segs=12))

    root = bpy.data.objects.new("vehicle_root", None)
    bpy.context.scene.collection.objects.link(root)
    for p in parts:
        p.parent = root
    col = make_collection("VEHICLE", [root] + parts)
    return root, col


# --------------------------------------------------------------------------
# FACILITY KIT — abandoned industrial hall props (tiles with origin at base)
# --------------------------------------------------------------------------

def build_facility_kit(rng_seed=404):
    rng = random.Random(rng_seed)
    concrete = mat_concrete()
    hull = mat_hull()
    parts = []

    # pillar (tall, chamfered by scale variance)
    parts.append(cyl("kit_pillar", 0.9, 14.0, (0, 0, 7.0), mat=concrete, verts=16))
    parts.append(box("kit_pillar_base", (2.6, 2.6, 0.5), (0, 0, 0.25), concrete))

    # catwalk segment 6 m
    parts.append(box("kit_catwalk_deck", (6.0, 1.4, 0.12), (0, 0, 4.0), hull))
    for i in range(5):
        parts.append(box(f"kit_rail_post_{i}", (0.05, 0.05, 1.0),
                         (-3.0 + i * 1.5, 0.65, 4.55), hull))
    parts.append(box("kit_rail", (6.0, 0.05, 0.05), (0, 0.65, 5.0), hull))

    # pipe run
    parts.append(cyl("kit_pipe", 0.18, 8.0, (0, 0.3, 6.2),
                     rot=(0, math.radians(90), 0), mat=hull, verts=16))
    parts.append(cyl("kit_pipe_flange_a", 0.26, 0.1, (-2.0, 0.3, 6.2),
                     rot=(0, math.radians(90), 0), mat=concrete, verts=16))
    parts.append(cyl("kit_pipe_flange_b", 0.26, 0.1, (1.0, 0.3, 6.2),
                     rot=(0, math.radians(90), 0), mat=concrete, verts=16))

    # crate stack
    parts.append(box("kit_crate_big", (1.2, 1.2, 1.2), (0, 0, 0.6), concrete))
    parts.append(box("kit_crate_small", (0.8, 0.8, 0.8),
                     (0.15 + rng() * 0.1, 0.2, 1.55), concrete))

    # door frame
    parts.append(box("kit_doorframe_L", (0.3, 0.3, 3.2), (-1.3, 0, 1.6), hull))
    parts.append(box("kit_doorframe_R", (0.3, 0.3, 3.2), (1.3, 0, 1.6), hull))
    parts.append(box("kit_doorframe_top", (2.9, 0.3, 0.3), (0, 0, 3.25), hull))

    root = bpy.data.objects.new("facility_kit_root", None)
    bpy.context.scene.collection.objects.link(root)
    for p in parts:
        p.parent = root
    col = make_collection("FACILITY_KIT", [root] + parts)
    return root, col


BUILDERS = {
    "robot": build_robot,
    "vehicle": build_vehicle,
    "facility_kit": build_facility_kit,
}
