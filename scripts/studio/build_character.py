"""An original stylized character with a deforming garment mesh and articulated hands.
No superhero body or clipped clothing. Every surface is modeled for this silhouette.
"""
import bpy,bmesh,math,pathlib
from mathutils import Vector,Matrix,Quaternion
R=pathlib.Path(__file__).resolve().parents[2]
for directory in ['public/models/studio', 'artifacts/studio']:
 (R/directory).mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
def v(p):return Vector((p[0],-p[2],p[1]))
def mat(n,h,r=.8):
 c=[int(h[i:i+2],16)/255 for i in (0,2,4)];c=[((x+.055)/1.055)**2.4 if x>.04045 else x/12.92 for x in c];m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*c,1);s.inputs['Roughness'].default_value=r;return m
skin=mat('Warm skin','B87A56');jacket=mat('Burnt sienna cotton','B86143');cuff=mat('Cotton seams','924730');tee=mat('Natural cotton','F1E1C0');denim=mat('Indigo denim','344C5E');thread=mat('Denim stitching','8E9D9B');hair=mat('Espresso hair','302923');hairlight=mat('Hair ridges','44352A');white=mat('Eye whites','F9EDDF',.35);iris=mat('Hazel iris','624328',.28);black=mat('Pupil','161C20',.25);sole=mat('Gum rubber','B2814D');shoe=mat('Canvas','DFD1B6');frame=mat('Acetate','473229',.32);metal=mat('Brass details','D8AC63',.35);lip=mat('Lips','914D3E')
rigdata=bpy.data.armatures.new('Studio character rig');rig=bpy.data.objects.new('CharacterRig',rigdata);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec={
 'pelvis':((0,.76,0),(0,.98,0),None),
 'spine':((0,1.02,0),(0,1.18,0),'pelvis'),
 'head':((0,1.235,0),(0,1.48,0),'spine'),
}
for i,s in enumerate([-1,1]):
 spec.update({f'arm{i}':((s*.21,1.15,0),(s*.21,.90,0),'spine'),f'elbow{i}':((s*.21,.90,0),(s*.21,.67,0),f'arm{i}'),f'hand{i}':((s*.21,.67,0),(s*.21,.60,0),f'elbow{i}'),f'leg{i}':((s*.10,.76,0),(s*.10,.43,0),'pelvis'),f'knee{i}':((s*.10,.43,0),(s*.10,.11,0),f'leg{i}'),f'foot{i}':((s*.10,.11,0),(s*.10,.11,.13),f'knee{i}')})
 for f in range(4):
  x=s*.21+(f-1.5)*.015
  for j in range(3):spec[f'finger{i}_{f}_{j}']=((x,.614-j*.019,.003),(x,.595-j*.019,.003),f'hand{i}' if j==0 else f'finger{i}_{f}_{j-1}')
 spec[f'thumb{i}']=((s*.21-s*.034,.647,.004),(s*.21-s*.04,.607,.025),f'hand{i}')
for name,(head,tail,parent) in spec.items():
 b=rigdata.edit_bones.new(name);b.head=v(head);b.tail=v(tail)
 if parent:b.parent=rigdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
def weights(o,fn):
 groups={}
 for vert in o.data.vertices:
  co=o.matrix_world@vert.co;p=(co.x,co.z,-co.y)
  for name,w in fn(p).items():
   if w<=0:continue
   if name not in groups:groups[name]=o.vertex_groups.new(name=name)
   groups[name].add([vert.index],w,'REPLACE')
 mod=o.modifiers.new('Skin deformation','ARMATURE');mod.object=rig;o.parent=rig
def rigid(n):return lambda p:{n:1}
def finish(o,name,m,fn):
 o.name=name;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 bpy.context.view_layer.objects.active=o
 weights(o,fn);return o
def ell(name,p,s,m,fn,seg=32):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=20,location=v(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m,fn)
def cube(name,p,s,r,m,fn):
 bpy.ops.mesh.primitive_cube_add(size=1,location=v(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);b=o.modifiers.new('Rounded stitching','BEVEL');b.width=r;b.segments=4;bpy.ops.object.modifier_apply(modifier=b.name);b=o.modifiers.new('Face normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=b.name);return finish(o,name,m,fn)
def loft(name,rings,m,fn,segments=40,wrinkle=.002):
 verts=[];faces=[]
 for j,(x,y,z,rx,rz) in enumerate(rings):
  for i in range(segments):
   a=i/segments*math.tau;w=1+wrinkle*math.sin(a*5+j*.9);verts.append(v((x+math.cos(a)*rx*w,y,z+math.sin(a)*rz*w)))
 for j in range(len(rings)-1):
  for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
 faces.append(tuple(reversed(range(segments))));faces.append(tuple((len(rings)-1)*segments+i for i in range(segments)))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,name,m,fn)
def curve(name,pts,r,m,fn):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for b,p in zip(s.bezier_points,pts):b.co=v(p);b.handle_left_type=b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,m,fn)
def mix(a,b,t):t=max(0,min(1,t));return {a:1-t,b:t}
def torso(p):return mix('pelvis','spine',(p[1]-.86)/.22)
def arm(i,p):return mix(f'elbow{i}',f'arm{i}',(p[1]-.87)/.09)
def leg(i,p):return mix(f'knee{i}',f'leg{i}',(p[1]-.38)/.10)
# Garments use longitudinal quad loops through elbows and knees, with real hems.
loft('Overshirt',[(0,y,z,rx,rz) for y,rx,rz,z in [(.738,.153,.104,0),(.755,.172,.113,0),(.79,.176,.12,0),(.85,.177,.12,0),(.93,.18,.125,0),(1.02,.195,.128,0),(1.08,.205,.117,0),(1.135,.205,.10,0),(1.17,.159,.084,0),(1.196,.091,.064,0)]],jacket,torso,48,.017)
loft('Neck',[(0,1.15,0,.066,.056),(0,1.25,0,.063,.055),(0,1.29,0,.074,.062)],skin,rigid('head'))
coat=bpy.data.objects['Overshirt'];bm=bmesh.new();bm.from_mesh(coat.data)
faces=[f for f in bm.faces if (lambda c: abs(c.x)<.063 and c.y<-.073 and .762<c.z<1.168)(f.calc_center_median())]
bmesh.ops.delete(bm,geom=faces,context='FACES');bm.to_mesh(coat.data);bm.free()
cube('T-shirt inset',(0,.979,.114),(.132,.393,.014),.014,tee,torso)
for s in [-1,1]:
 curve('Placket',[(s*.065,.77,.118),(s*.064,1.07,.128),(s*.088,1.164,.079)],.008,cuff,torso)
 curve('Folded collar',[(s*.094,1.197,.024),(s*.10,1.169,.077),(s*.055,1.105,.134),(s*.027,1.179,.073)],.014,jacket,torso)
for y in [.83,.94,1.05]:ell('Button',(.075,y,.137),(.008,.008,.004),metal,torso,16)
cube('Chest pocket',(-.124,1.044,.122),(.078,.087,.018),.008,jacket,torso)
curve('Pocket stitching',[(-.16,1.08,.134),(-.16,1.015,.134),(-.087,1.015,.139),(-.087,1.08,.139)],.0015,tee,torso)
curve('Shirt hem',[(-.16,.755,.056),(-.12,.746,.093),(0,.743,.115),(.12,.746,.093),(.16,.755,.056)],.0025,cuff,torso)
for i,s in enumerate([-1,1]):
 fn=lambda p,i=i:arm(i,p)
 loft('Sleeve'+str(i),[(s*.21,y,0,rx,rz) for y,rx,rz in [(.687,.048,.05),(.71,.050,.054),(.76,.061,.063),(.82,.065,.062),(.86,.067,.062),(.90,.070,.061),(.94,.075,.063),(1.01,.080,.071),(1.09,.082,.077),(1.15,.075,.07),(1.20,.032,.032)]],jacket,fn,40,.022)
 loft('Rolled cuff'+str(i),[(s*.21,y,0,.058,r) for y,r in [(.685,.052),(.692,.058),(.731,.058),(.738,.052)]],cuff,rigid(f'elbow{i}'))
 curve('Sleeve seam',[(s*.26,.747,.022),(s*.282,.90,.023),(s*.287,1.11,.022)],.0017,tee,fn)
 ell('Palm'+str(i),(s*.21,.633,.0),(.042,.053,.025),skin,rigid(f'hand{i}'))
 for f in range(4):
  x=s*.21+(f-1.5)*.015
  for j in range(3):
   ell('Finger',(x,.604-j*.019,.003),(.0085,.014,.010),skin,rigid(f'finger{i}_{f}_{j}'),16)
 ell('Thumb',(s*.21-s*.035,.627,.016),(.013,.031,.014),skin,rigid(f'thumb{i}'),20)
 fn=lambda p,i=i:leg(i,p)
 loft('Trouser'+str(i),[(s*.1,y,z,rx,rz) for y,rx,rz,z in [(.125,.063,.063,0),(.145,.067,.067,0),(.21,.068,.069,0),(.30,.074,.073,0),(.38,.078,.075,.005),(.43,.080,.075,.012),(.48,.081,.079,.005),(.59,.09,.085,0),(.68,.098,.10,0),(.75,.10,.108,0),(.78,.092,.096,0)]],denim,fn,40,.012)
 curve('Outside seam',[(s*.164,.15,.0),(s*.173,.43,0),(s*.193,.72,.014)],.0014,thread,fn)
 loft('Trouser cuff'+str(i),[(s*.1,y,0,.068,.065) for y in [.128,.155]],denim,rigid(f'knee{i}'))
 cube('Rubber sole',(s*.1,.046,.043),(.16,.04,.266),.024,sole,rigid(f'foot{i}'))
 cube('Sneaker upper',(s*.1,.092,.033),(.149,.082,.234),.04,shoe,rigid(f'foot{i}'))
 cube('Toe cap',(s*.1,.088,.127),(.144,.060,.066),.026,tee,rigid(f'foot{i}'))
 for j in range(4):curve('Shoelace',[(s*.1-.042,.139-j*.006,.022+j*.021),(s*.1+.037,.140-j*.006,.029+j*.021)],.0035,tee,rigid(f'foot{i}'))
 curve('Shoe seam',[(s*.1-.066,.082,-.051),(s*.1-.064,.104,.038),(s*.1-.057,.100,.115)],.002,cuff,rigid(f'foot{i}'))
# A sculpted face, brows, nose, ears, subtle beard and expressive eyes.
H=rigid('head')
head=loft('Face',[(0,y,z,rx,rz) for y,rx,rz,z in [(1.223,.045,.056,.028),(1.237,.079,.072,.027),(1.27,.116,.091,.018),(1.31,.135,.105,0),(1.36,.145,.112,-.008),(1.42,.139,.107,-.012),(1.47,.119,.091,-.016),(1.50,.07,.061,-.017),(1.51,.008,.008,-.018)]],skin,H,64,.0)
for s in [-1,1]:
 ell('Ear',(s*.139,1.338,-.003),(.026,.043,.022),skin,H)
 ell('Ear inner',(s*.156,1.34,.010),(.009,.025,.01),lip,H,20)
 ell('Eye',(s*.052,1.379,.095),(.037,.022,.024),white,H)
 ell('Iris',(s*.049,1.379,.116),(.014,.016,.007),iris,H)
 ell('Pupil',(s*.047,1.379,.122),(.0075,.010,.003),black,H)
 ell('Eye glint',(s*.049-.003,1.386,.125),(.0033,.0033,.002),white,H,16)
 curve('Eyebrow',[(s*.021,1.417,.095),(s*.05,1.427,.096),(s*.089,1.417,.079)],.0065,hair,H)
ell('Nose bridge',(0,1.355,.104),(.020,.033,.025),skin,H)
ell('Nose tip',(0,1.338,.127),(.028,.017,.025),skin,H)
for s in [-1,1]:ell('Nostril',(s*.017,1.326,.137),(.005,.0027,.002),lip,H,16)
curve('Upper lip',[(-.035,1.294,.106),(0,1.293,.117),(.035,1.298,.107)],.0034,lip,H)
curve('Lower lip',[(-.021,1.285,.109),(0,1.283,.111),(.022,1.288,.108)],.002,skin,H)
# Short stubble is a silhouette detail, with no dark painted mask.
for s in [-1,1]:curve('Sideburn',[(s*.127,1.408,.032),(s*.13,1.355,.027),(s*.123,1.317,.046)],.009,hair,H)
# Sculpted cap follows the skull; swept quiff is a continuous asymmetrical loft.
loft('Hair cap',[(0,1.34,-.040,.133,.092),(0,1.41,-.040,.141,.093),(0,1.45,-.03,.147,.116),(0,1.49,-.023,.136,.112),(-.017,1.53,-.017,.105,.095),(-.025,1.55,-.010,.052,.054),(-.025,1.557,-.010,.001,.001)],hair,H,64)
for i in range(7):
 x=-.11+i*.032
 curve('Swept lock',[(x,1.444,.07),(x-.03,1.505,.10),(x-.026,1.547,.028),(x+.015,1.515,-.070)],.017 if i<5 else .013,hair,H)
 curve('Hair groove',[(x-.008,1.471,.083),(x-.040,1.517,.080),(x-.031,1.55,.02)],.002,hairlight,H)
# Rounded square acetate glasses, with bridge, hinges, and arms around ears.
for s in [-1,1]:
 cx=s*.056;pts=[]
 for i in range(40):
  a=i/40*math.tau;pts.append((cx+math.copysign(abs(math.cos(a))**.45,math.cos(a))*.041,1.38+math.copysign(abs(math.sin(a))**.45,math.sin(a))*.031,.130-abs(math.cos(a))*.003))
 pts.append(pts[0]);curve('Acetate rim',pts,.0038,frame,H)
 curve('Glasses arm',[(s*.096,1.39,.125),(s*.145,1.389,.05),(s*.143,1.375,-.030)],.003,frame,H)
curve('Glasses bridge',[(-.015,1.384,.131),(0,1.39,.135),(.015,1.384,.131)],.0035,frame,H)
# Bake skinned surfaces per material, preserving weights and skeleton.
for m in list(bpy.data.materials):
 items=[o for o in bpy.data.objects if o.type=='MESH' and o.data.materials[0]==m]
 if not items:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in items:o.select_set(True)
 bpy.context.view_layer.objects.active=items[0]
 if len(items)>1:bpy.ops.object.join()
 items[0].name=m.name.replace(' ','_')
for o in bpy.data.objects:
 if o.type=='MESH':
  # Correct outward normals after joining the quad lofts.
  bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(R/'public/models/studio/character.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'artifacts/studio/character.blend'))
print('CHARACTER EXPORTED')
