"""Original miniature bedroom, authored in metres. Blender 4.5, no external assets.

Coordinates in the helpers match the web scene: X right, Y up, Z toward the viewer.
Movable objects keep named roots; static meshes are joined by material on export.
Run: blender --background --factory-startup --python scripts/studio/build_scene.py
"""
import bpy, math, random, pathlib
from mathutils import Vector
R=pathlib.Path(__file__).resolve().parents[2]
for directory in ['public/models/studio', 'artifacts/studio']:
 (R/directory).mkdir(parents=True, exist_ok=True)
random.seed(18)
bpy.ops.wm.read_factory_settings(use_empty=True)
def v(p): return Vector((p[0],-p[2],p[1]))
def mat(name,hex,rough=.65,metal=0,glow=0):
 c=tuple(int(hex[i:i+2],16)/255 for i in (0,2,4)); c=tuple(((x+.055)/1.055)**2.4 if x>.04045 else x/12.92 for x in c)
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
 if glow:n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=glow
 return m
M={k:mat(k,c,r,me,e) for k,c,r,me,e in [
 ('butter','E6C899',.86,0,0),('cream','FFF0D4',.85,0,0),('rose','CB795E',.86,0,0),('clay','B7573C',.86,0,0),('ink','243B46',.7,0,0),('teal','398B86',.85,0,0),('sea','6CAC9D',.9,0,0),('gold','EAB758',.6,.1,0),('oak','C38A51',.56,0,0),('walnut','784626',.62,0,0),('edge','9B653F',.6,0,0),('black','172329',.4,.2,0),('metal','6D8186',.26,.7,0),('ivory','E4DACA',.85,0,0),('paper','FFF7E4',.85,0,0),('purple','9283AF',.85,0,0),('leaf','54845F',.85,0,0),('leaf2','86A167',.9,0,0),('soil','433525',1,0,0),('light','FFDC98',.3,0,2),('screen','426D7A',.45,0,.45),('blue','639BC0',.85,0,0),('orange','E89047',.8,0,0)]}
def root(name,at=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=v(at);o.parent=parent;return o
room=root('Studio');static=root('Architecture',parent=room)
def finish(o,name,m,parent):
 o.name=name;o.data.materials.append(M[m] if isinstance(m,str) else m);o.parent=parent
 if o.type=='MESH':
  for f in o.data.polygons:f.use_smooth=True
 return o
def cube(name,p,size,m='cream',r=.015,parent=static):
 bpy.ops.mesh.primitive_cube_add(size=1,location=v(p));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  b=o.modifiers.new('Soft edges','BEVEL');b.width=r;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name)
  b=o.modifiers.new('Face normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=b.name)
 return finish(o,name,m,parent)
def ell(name,p,s,m='cream',parent=static,segments=24):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=16,location=v(p));o=bpy.context.object;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m,parent)
def rod(name,a,b,r,m='metal',parent=static,r2=None):
 d=v(b)-v(a);bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(v(a)+v(b))*.5);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');be=o.modifiers.new('Edge','BEVEL');be.width=min(r*.2,.005);be.segments=2;bpy.ops.object.modifier_apply(modifier=be.name);return finish(o,name,m,parent)
def curve(name,pts,r,m='metal',parent=static,cyclic=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for b,p in zip(s.bezier_points,pts):b.co=v(p);b.handle_left_type=b.handle_right_type='AUTO'
 s.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);return finish(o,name,m,parent)
def text(name,body,p,size,m='cream',parent=static,rot=(math.pi/2,0,0)):
 c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.extrude=.0003;c.align_x='CENTER';o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=v(p);o.rotation_euler=rot;return finish(o,name,m,parent)
def torus(name,p,major,minor,m='cream',parent=static,rotation=(math.pi/2,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=10,location=v(p),major_radius=major,minor_radius=minor,rotation=rotation);return finish(bpy.context.object,name,m,parent)
def book(p,w,h,d,color='teal',lean=0,parent=static):
 g=root('Book',p,parent);cube('Bound cover',(0,h/2,0),(w,h,d),color,.005,g);cube('Page block',(0,h/2,.007),(w-.012,h-.015,d-.018),'ivory',.002,g)
 cube('Spine',(0,h/2,d/2+.002),(w,h,.015),color,.004,g)
 for y in [.10,h-.06]:cube('Spine foil',(0,y,d/2+.011),(w*.7,.005,.002),'gold',.001,g)
 g.rotation_euler.y=lean;return g
def plant(p,scale=1,parent=static):
 g=root('Plant',p,parent);rod('Terracotta',(0,0,0),(0,.16,0),.075,'clay',g,.095);rod('Soil',(0,.159,0),(0,.165,0),.082,'soil',g);torus('Pot lip',(0,.153,0),.092,.012,'rose',g,(0,0,0))
 for i in range(9):
  a=i*2.399;h=.28+(i%4)*.075;end=(math.cos(a)*.14,h,math.sin(a)*.14);curve('Stem',[(0,.16,0),(end[0]*.4,h*.85,end[2]*.4),end],.004,'leaf',g)
  leaf=ell('Waxy leaf',end,(.07,.015,.12),'leaf' if i%2 else 'leaf2',g);leaf.rotation_euler=(.2*math.sin(a),.3,a)
 g.scale=(scale,scale,scale);return g
def pillow(p,s=(.58,.14,.36),color='cream',parent=static):
 # Sewn superellipse; top surface is broad and domed, with pinched seams.
 verts=[];faces=[];nu=48;nv=24
 for j in range(nv+1):
  t=j/nv*math.pi
  for i in range(nu):
   a=i/nu*math.tau;ss=math.sin(t);x=s[0]/2*math.copysign(abs(math.cos(a))**.42,math.cos(a))*ss;z=s[2]/2*math.copysign(abs(math.sin(a))**.42,math.sin(a))*ss;y=s[1]/2*math.cos(t)+.004*math.sin(a*12)*ss**10;verts.append(v((p[0]+x,p[1]+y,p[2]+z)))
 for j in range(nv):
  for i in range(nu):a=j*nu+i;b=j*nu+(i+1)%nu;faces.append((a,b,b+nu,a+nu))
 mesh=bpy.data.meshes.new('Sewn cushion');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Sewn cushion',mesh);bpy.context.collection.objects.link(o);finish(o,'Sewn cushion',color,parent)
 pts=[]
 for i in range(64):
  a=i/64*math.tau;pts.append((p[0]+s[0]/2*math.copysign(abs(math.cos(a))**.42,math.cos(a)),p[1],p[2]+s[2]/2*math.copysign(abs(math.sin(a))**.42,math.sin(a))))
 curve('Pillow welt',pts,.002,'ivory',parent,True);return o

# Cutaway shell, crown molding, broad window, warm oak floor.
cube('Foundation',(0,-.14,0),(5.68,.26,4.88),'walnut',.08)
for row in range(24):
 z=-2.3+row*.2
 for col in range(-1,5):
  x=-2.8+col*1.15+(row%2)*.575;lo=max(-2.8,x);hi=min(2.8,x+1.145)
  if hi<=lo:continue
  wood=mat('Oak tone %s %s'%(row,col),random.choice(['C9945D','D6A66D','D3A16A','C89A65','D0A16C']),.64)
  cube('Floor plank',((lo+hi)/2,.007,z),(hi-lo,.035,.195),wood,.006)
  # Restrained physical grain catches grazing light.
  if (row+col)%3==0:
   for k in range(2):curve('Oak grain',[(lo+.03,.026,z-.025+k*.05),((lo+hi)/2,.026,z-.015+k*.05),(hi-.03,.026,z-.03+k*.05)],.0005,'edge')
cube('Left wall',(-2.84,1.42,0),(.14,2.84,4.84),'rose',.015)
# Window centered above the bed. Walls form a real opening.
for x,w in [(-2.50,.60),(1.20,3.20)]:cube('Back plaster',(x,1.42,-2.44),(w,2.84,.14),'butter',.01)
cube('Window below',(-1.45,.48,-2.44),(1.50,.96,.14),'butter')
cube('Window above',(-1.45,2.65,-2.44),(1.50,.38,.14),'butter')
for x in [-2.22,-.68]:cube('Window casing',(x,1.72,-2.33),(.09,1.58,.13),'cream',.008)
for y in [.98,2.47]:cube('Window casing',(-1.45,y,-2.33),(1.63,.09,.13),'cream',.008)
cube('Window mullion',(-1.45,1.72,-2.37),(.05,1.45,.06),'cream',.006)
cube('Window transom',(-1.45,1.76,-2.37),(1.45,.045,.06),'cream',.006)
cube('Window sill',(-1.45,.94,-2.27),(1.77,.08,.34),'cream',.015)
sky=mat('Outside morning','ABD4DF',1,0,.22);cube('Sky',(-1.45,1.72,-2.56),(1.53,1.51,.025),sky,.01)
for i in range(7):
 x=-2.2+i*.23;ell('Distant foliage',(x,1.05+random.random()*.26,-2.51),(.3,.4,.015),'sea')
for y in [.12,2.79]:
 cube('Left molding',(-2.73,y,0),(.09,.13 if y<1 else .10,4.8),'cream',.009)
 cube('Back molding',(0,y,-2.33),(5.6,.13 if y<1 else .10,.08),'cream',.009)
# Wainscot panel rhythm on left wall.
for z in [-1.9,-.9,.1,1.1,2.1]:cube('Wall batten',(-2.756,.58,z),(.028,.94,.026),'clay',.005)
cube('Dado rail',(-2.736,1.06,0),(.058,.04,4.8),'clay',.008)
curtains=root('Curtains',parent=room)
for side in [-1,1]:
 g=root('Curtain'+str(side),(-1.45+side*.73,1.73,-2.18),curtains)
 verts=[];faces=[]
 for j in range(25):
  for i in range(21):
   u=i/20;h=j/24;x=(u-.5)*.38;z=.05*math.sin(u*math.pi*8)+.016*math.sin(h*6);verts.append(v((x,.75-h*1.5,z)))
 for j in range(24):
  for i in range(20):a=j*21+i;faces.append((a,a+21,a+22,a+1))
 me=bpy.data.meshes.new('Curtain cloth');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Curtain cloth',me);bpy.context.collection.objects.link(o);finish(o,'Curtain cloth','cream',g)
rod('Curtain pole',(-2.4,2.53,-2.14),(-.50,2.53,-2.14),.015,'walnut')

# Bed, upholstered headboard, curved edges, separate animated quilt.
bed=root('Bed',(-1.91,0,-1.14),room)
for x in [-.56,.56]:
 for z in [-.87,.87]:rod('Bed leg',(x,.035,z),(x,.28,z),.045,'walnut',bed)
cube('Bed frame',(0,.29,0),(1.48,.19,2.18),'oak',.045,bed)
cube('Mattress piping',(0,.41,0),(1.40,.11,2.11),'ivory',.055,bed)
cube('Mattress',(0,.49,0),(1.39,.17,2.10),'cream',.074,bed)
cube('Headboard',(0,.77,-1.02),(1.47,.89,.13),'teal',.09,bed)
for x in [-.47,0,.47]:cube('Headboard channel',(x,.82,-.939),(.435,.70,.05),'sea',.05,bed)
pillow((-.32,.64,-.77),(.62,.17,.40),'cream',bed);pillow((.32,.64,-.77),(.62,.17,.40),'gold',bed)
# Dense cloth grid with two morph targets: lifted edge and sleeping drape.
verts=[];faces=[];nx=48;nz=44
def quiltpoint(i,j,state=0):
 u=i/nx*2-1;t=j/nz;x=u*.762;z=-.44+t*1.61
 y=.604+.012*math.sin(u*10+t*7)+.010*math.sin(u*27+t*22)
 y-=max(0,abs(u)-.88)*1.10+max(0,t-.92)*1.9
 if state==1 and x>-.40:
  fold=(x+.40)/1.162;x=-.40-(x+.40)*.29;y+=.045+.14*math.sin(fold*math.pi)
 if state==2:
  z-=.10*(1-t);y+=.30*math.exp(-(u/.48)**4)*(.88+.12*math.sin(t*math.pi))
 return v((x,y,z))
for j in range(nz+1):
 for i in range(nx+1):verts.append(quiltpoint(i,j))
for j in range(nz):
 for i in range(nx):a=j*(nx+1)+i;faces.append((a,a+nx+1,a+nx+2,a+1))
me=bpy.data.meshes.new('Quilt cloth');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Quilt',me);bpy.context.collection.objects.link(o);finish(o,'Quilt','teal',bed)
o.shape_key_add(name='Basis')
for name,state in [('Lift',1),('Sleep',2)]:
 k=o.shape_key_add(name=name)
 for j in range(nz+1):
  for i in range(nx+1):k.data[j*(nx+1)+i].co=quiltpoint(i,j,state)
sol=o.modifiers.new('Quilt thickness','SOLIDIFY');sol.thickness=.019
# Relaxed throw over the foot; narrow stripes and tassels.
for j in range(12):
 z=.57+j*.038;pts=[]
 for i in range(30):
  x=-.79+i/29*1.58;y=.64-.19*max(0,(abs(x)-.65)/.14)+.014*math.sin(i*.8+j*.23);pts.append((x,y,z))
 curve('Woven throw',pts,.026,'rose' if j%3 else 'cream',bed)
for i in range(20):
 x=-.77+i*.08;curve('Throw fringe',[(x,.635,.998),(x+.005,.62,1.04),(x-.01,.59,1.07)],.006,'cream',bed)

# Desk island, drawer pedestal, underside cable tray, monitor and tactile objects.
desk=root('Desk',(.85,0,-1.99),room)
cube('Desktop',(0,.77,0),(1.91,.075,.77),'oak',.035,desk)
for x in [-.86,.86]:
 for z in [-.28,.28]:rod('Desk leg',(x,.035,z),(x*.95,.74,z*.92),.031,'walnut',desk)
cube('Cable tray',(0,.66,-.21),(1.28,.06,.17),'black',.015,desk)
cube('Desk mat',(.06,.814,.075),(1.16,.008,.42),'ink',.03,desk)
cube('Drawer pedestal',(-.67,.38,-.03),(.36,.65,.53),'cream',.025,desk)
for y in [.28,.50,.67]:
 cube('Drawer',(-.67,y,.252),(.326,.13,.02),'cream',.008,desk);rod('Drawer pull',(-.73,y,.274),(-.61,y,.274),.009,'oak',desk)
monitor=root('Monitor',(.07,.817,-.15),desk)
cube('Monitor foot',(0,.007,.015),(.32,.025,.19),'ivory',.022,monitor);rod('Monitor stem',(0,.025,-.02),(0,.23,-.02),.029,'ivory',monitor)
display=root('Display',(0,.395,0),monitor)
cube('Monitor shell',(0,0,0),(.94,.57,.074),'ivory',.026,display)
cube('Monitor black bezel',(0,.010,.042),(.906,.527,.012),'black',.016,display)
screen=cube('ComputerSurface',(0,.015,.050),(.863,.485,.004),'screen',.008,display)
text('Monitor brand','s t u d i o',(0,-.254,.052),.016,'edge',display)
ell('Webcam',(0,.285,.045),(.009,.009,.004),'black',display)
keyboard=root('Keyboard',(-.06,.830,.20),desk)
cube('Keyboard case',(0,0,0),(.49,.03,.16),'cream',.014,keyboard)
for j in range(4):
 for i in range(14):
  if j==3 and 4<=i<=9:continue
  cube('Keycap',(-.222+i*.034,.022,-.056+j*.036),(.028,.016,.028),'gold' if (i==0 and j==0) else 'ivory',.004,keyboard)
cube('Spacebar',(0,.022,.052),(.19,.016,.028),'teal',.004,keyboard)
ell('Mouse',(.43,.839,.21),(.040,.025,.063),'cream',desk)
curve('Mouse seam',[(.43,.862,.155),(.43,.865,.19)],.001,'edge',desk)
# Speakers, headphones, small laptop, pencil cup, sketchpad.
for x in [-.52,.65]:
 cube('Speaker',(x,.943,-.17),(.14,.25,.15),'walnut',.022,desk)
 for y,r in [(.91,.044),(.999,.022)]:rod('Speaker driver',(x,y,-.090),(x,y,-.077),r,'black',desk)
headphones=root('Headphones',(.70,.90,.07),desk)
curve('Headband',[(-.11,0,0),(-.11,.15,0),(0,.20,0),(.11,.15,0),(.11,0,0)],.014,'ink',headphones)
for x in [-.108,.108]:cube('Ear cushion',(x,.018,0),(.052,.105,.087),'black',.024,headphones)
rod('Pen cup',(-.80,.818,-.18),(-.80,.918,-.18),.038,'teal',desk)
for i in range(5):rod('Pencil',(-.81+(i%3)*.012,.84,-.18),(-.825+(i%3)*.016,1.0+(i%2)*.026,-.17),.003,'gold',desk)
paper=root('Paper',(-.71,.815,.15),desk);cube('Resume sheet',(0,0,0),(.24,.003,.33),'paper',.002,paper)
for i in range(11):cube('Printed line',(-.015,.002,-.10+i*.020),(.16 if i<3 else .19,.001,.003),'edge',.0005,paper)
text('Page name','SEHAL SEIN',(0,.003,-.125),.024,'ink',paper,(0,0,0))
mug=root('Mug',(1.29,.82,-1.70),room)
# Lathed hollow stoneware cup, real handle and coffee surface.
profile=[(.032,0),(.044,.006),(.050,.025),(.050,.099),(.048,.110),(.043,.110),(.041,.098),(.041,.024),(.03,.018)]
vs=[];fs=[]
for rad,h in profile:
 for i in range(48):a=i/48*math.tau;vs.append(v((math.cos(a)*rad,h,math.sin(a)*rad)))
for j in range(len(profile)-1):
 for i in range(48):a=j*48+i;b=j*48+(i+1)%48;fs.append((a,b,b+48,a+48))
me=bpy.data.meshes.new('Stoneware');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('Stoneware',me);bpy.context.collection.objects.link(o);finish(o,'Stoneware','clay',mug)
curve('Cup handle',[(.044,.09,0),(.084,.092,0),(.091,.055,0),(.070,.027,0),(.046,.035,0)],.009,'clay',mug)
rod('Coffee',(0,.092,0),(0,.094,0),.040,'walnut',mug)
curve('Latte swirl',[(math.cos(t*.3)*(.003+t*.0009),.095,math.sin(t*.3)*(.003+t*.0009)) for t in range(28)],.0018,'cream',mug)

# Compact ergonomic chair, curved upholstered shell and five-star caster base.
chair=root('Chair',(.92,0,-1.18),room)
rod('Gas lift',(0,.12,0),(0,.43,0),.025,'metal',chair)
for i in range(5):
 a=i*math.tau/5;end=(math.cos(a)*.245,.055,math.sin(a)*.245);rod('Star spoke',(0,.15,0),end,.017,'cream',chair)
 for s in [-1,1]:ell('Caster',(end[0]+s*.015,.044,end[2]),(.019,.034,.032),'ink',chair,16)
pillow((0,.475,0),(.50,.10,.46),'rose',chair)
cube('Seat pan',(0,.427,0),(.46,.028,.43),'clay',.028,chair)
curve('Back spine',[(0,.41,.15),(0,.52,.32),(0,.75,.33)],.018,'cream',chair)
back=cube('Chair back',(0,.76,.225),(.48,.43,.085),'rose',.07,chair);back.rotation_euler.x=-.12
for x in [-.257,.257]:
 curve('Arm support',[(x,.44,.12),(x,.59,.15),(x,.66,.10)],.012,'cream',chair);cube('Armrest',(x,.67,.034),(.048,.035,.27),'clay',.017,chair)

# Beside the bed: notebook, amber bedside lamp, and small stacked books.
night=root('Nightstand',(-.86,0,-1.96),room)
cube('Nightstand cabinet',(0,.31,0),(.42,.51,.48),'clay',.035,night);cube('Nightstand top',(0,.58,0),(.45,.045,.51),'oak',.015,night)
cube('Nightstand drawer',(0,.41,.252),(.37,.19,.016),'rose',.012,night);ell('Drawer knob',(0,.42,.272),(.016,.016,.012),'gold',night)
lamp=root('Lamp',(-.84,.604,-2.04),room)
rod('Lamp stem',(0,0,0),(0,.21,0),.022,'gold',lamp);ell('Lamp foot',(0,.01,0),(.089,.02,.089),'gold',lamp)
rod('Pleated shade',(0,.18,0),(0,.37,0),.13,'cream',lamp,.065)
for i in range(40):
 a=i*math.tau/40;rod('Shade pleat',(math.cos(a)*.13,.18,math.sin(a)*.13),(math.cos(a)*.065,.37,math.sin(a)*.065),.0015,'ivory',lamp)
ell('Bulb',(0,.195,0),(.027,.04,.027),'light',lamp)
notebook=root('Notebook',(-.88,.612,-1.82),room);cube('Notebook binding',(0,0,0),(.25,.016,.17),'ink',.007,notebook);cube('Notebook pages',(0,.01,0),(.236,.012,.159),'paper',.003,notebook)
for i in range(6):cube('Notebook line',(0,.017,-.046+i*.018),(.17,.001,.0015),'edge',.0005,notebook)

# Shelves and collected objects. Each shelf has an intentional arrangement.
shelf=root('Bookshelf',(2.28,0,-2.04),room)
for x in [-.32,.32]:cube('Upright',(x,1.0,0),(.045,2.0,.53),'oak',.012,shelf)
cube('Shelf back',(0,1,-.246),(.64,2,.028),'walnut',.004,shelf)
for y in [.10,.55,1,1.46,1.96]:cube('Shelf',(0,y,0),(.69,.044,.55),'oak',.009,shelf)
for row,y in enumerate([.123,.573,1.024]):
 for i in range(6):
  if row==2 and i in [1,2,3]:continue
  book((-.24+i*.079,y,.04),.055,.25+(i%3)*.029,.19,['teal','cream','clay','blue','gold','purple'][(i+row)%6],.02*(i%3-1),shelf)
plant((.16,1.985,.02),.73,shelf)
figure=root('Figure',(2.15,1.06,-1.96),room)
ell('Astronaut helmet',(0,.22,0),(.066,.07,.059),'cream',figure)
ell('Astronaut visor',(0,.222,.042),(.049,.041,.028),'gold',figure)
cube('Astronaut suit',(0,.105,0),(.105,.11,.074),'cream',.027,figure)
cube('Life support',(0,.119,-.055),(.09,.10,.034),'ink',.012,figure)
for x in [-.037,.037]:rod('Boot',(x,.017,.004),(x,.065,0),.026,'ivory',figure)
for x in [-.08,.08]:rod('Arm',(x,.082,0),(x*.70,.149,0),.022,'cream',figure)
rod('Display plinth',(0,0,0),(0,.013,0),.10,'walnut',figure)
# Cork board and several layered notes.
board=root('Board',(.98,1.99,-2.31),room)
cube('Cork frame',(0,0,0),(1.15,.60,.052),'walnut',.017,board);cube('Cork',(0,0,.031),(1.095,.543,.014),'edge',.004,board)
for i,(x,y,s,c) in enumerate([(-.32,.08,.22,'paper'),(-.02,-.08,.19,'gold'),(.30,.07,.25,'cream')]):
 o=cube('Pinned paper',(x,y,.045),(s,s*.91,.003),c,.001,board);o.rotation_euler.y=.08*(i-1);ell('Drawing pin',(x,y+s*.34,.053),(.011,.011,.007),'clay',board)
 for j in range(3):cube('Note scribble',(x,y+.04-j*.035,.050),(s*.64,.002,.0015),'edge',.0005,board)
text('Board title','MAKE / PLAY / REPEAT',(0,.36,.03),.045,'ink',board)

# Media corner, compact low cabinet, game console and listening chair.
media=root('Media',(2.39,0,.43),room);media.rotation_euler.z=-math.pi/2
cube('Media console',(0,.27,0),(1.22,.43,.39),'oak',.026,media)
for x in [-.44,.44]:
 for z in [-.13,.13]:rod('Cabinet leg',(x,.025,z),(x,.105,z),.018,'walnut',media)
for x in [-.39,0,.39]:cube('Cabinet door',(x,.28,.207),(.366,.35,.016),'walnut',.01,media)
tv=root('TV',(0,.51,-.035),media);cube('TV housing',(0,.36,0),(1.08,.64,.055),'ink',.025,tv);cube('TVSurface',(0,.366,.031),(1.018,.571,.003),'screen',.012,tv)
for x in [-.37,.37]:rod('TV foot',(x,.025,.08),(x*.9,.075,0),.011,'black',tv)
cube('Console',(-.37,.528,.12),(.28,.033,.16),'cream',.013,media)
for i in range(8):cube('Cooling vent',(-.45+i*.018,.546,.12),(.004,.001,.083),'ink',.001,media)
controller=root('Controller',(2.03,.57,.54),room);cube('Gamepad',(0,0,0),(.18,.048,.105),'cream',.026,controller)
for x in [-.047,.047]:rod('Thumbstick',(x,.021,0),(x,.036,0),.014,'ink',controller)
sofa=root('Lounge',(1.40,0,1.67),room);sofa.rotation_euler.z=-.25
for x in [-.34,.34]:
 for z in [-.32,.32]:rod('Lounge leg',(x,.03,z),(x,.22,z),.024,'walnut',sofa)
cube('Lounge shell',(0,.29,0),(.88,.27,.85),'teal',.09,sofa);pillow((0,.45,-.035),(.68,.16,.68),'sea',sofa)
cube('Lounge back',(0,.65,.30),(.84,.65,.15),'teal',.09,sofa)
for x in [-.38,.38]:cube('Lounge arm',(x,.48,0),(.15,.31,.85),'teal',.068,sofa)
pillow((.14,.69,.17),(.36,.14,.36),'gold',sofa)
side=root('Side table',(.48,0,1.65),room);rod('Table pedestal',(0,.04,0),(0,.49,0),.029,'walnut',side);rod('Table top',(0,.47,0),(0,.52,0),.25,'oak',side);rod('Table foot',(0,.035,0),(0,.060,0),.17,'walnut',side)
book((-.09,.534,0),.12,.025,.19,'rose',0,side)

# Wardrobe and small personal details fill the left foreground.
wardrobe=root('Wardrobe',(-2.47,0,1.13),room);wardrobe.rotation_euler.z=math.pi/2
cube('Wardrobe case',(0,.93,0),(1.02,1.82,.54),'teal',.026,wardrobe)
for side in [-1,1]:
 door=root('Door'+str(side),(side*.48,.93,.291),wardrobe);cube('Inset door',(-side*.236,0,0),(.467,1.73,.036),'sea',.012,door)
 for x in [-side*.40,-side*.074]:cube('Door molding',(x,0,.024),(.015,1.55,.013),'teal',.004,door)
 rod('Brass pull',(-side*.072,-.035,.043),(-side*.072,.095,.043),.008,'gold',door)
plant((-2.40,1.86,1.39),1.1)
care=root('CarePlant',(-2.30,0,2.02),room)
for x in [-.22,.22]:
 for z in [-.17,.17]:rod('Plant stand leg',(x,.03,z),(x,.56,z),.017,'walnut',care)
cube('Plant stand top',(0,.57,0),(.67,.045,.45),'oak',.025,care)
plant((-.14,.595,0),.85,care)
can=root('WateringCan',(-2.12,.595,2.06),room)
rod('Watering can body',(0,.008,0),(0,.12,0),.052,'gold',can,.061)
torus('Can top lip',(0,.124,0),.055,.006,'gold',can,(0,0,0))
rod('Can opening',(0,.123,0),(0,.125,0),.042,'soil',can)
curve('Can handle',[(.04,.10,0),(.09,.11,0),(.095,.035,0),(.045,.02,0)],.009,'gold',can)
rod('Pouring spout',(-.035,.032,0),(-.19,.145,0),.018,'gold',can,.009)
rod('Spout mouth',(-.190,.145,0),(-.197,.151,0),.011,'soil',can)
cord=root('CurtainCord',(-.57,1.00,-2.17),room)
curve('Pull cord',[(0,1.43,0),(.008,.70,0),(0,.06,0)],.002,'walnut',cord)
ell('Cord tassel',(0,.025,0),(.012,.033,.012),'gold',cord)
cube('Storage box',(-2.46,1.99,.88),(.42,.21,.31),'gold',.02)
for x in [-2.64,-2.26]:cube('Box label',(x,1.99,1.041),(.08,.05,.002),'cream',.002)
# Rug is a deliberately graphic woven design; layered rounded border.
cube('Rug piping',(-.16,.039,.52),(2.20,.026,2.62),'cream',.17)
cube('Rug',(-.16,.055,.52),(2.13,.018,2.55),'clay',.15)
for i in range(7):cube('Rug stripe',(-.16,.066,-.64+i*.37),(2.0,.002,.035),'rose',.013)
for s in [-1,1]:
 for i in range(26):curve('Rug fringe',[(-1.08+i*.073,.041,.52+s*1.27),(-1.08+i*.073,.041,.52+s*1.35)],.005,'cream')
# Posters with original graphic artwork, laid out as physical frame meshes.
for i,(z,y,w,h) in enumerate([(-1.13,2.05,.58,.76),(-.31,2.20,.53,.59),(.43,1.98,.45,.64)]):
 g=root('Art'+str(i),(-2.743,y,z),room);g.rotation_euler.z=math.pi/2
 cube('Art frame',(0,0,0),(w+.05,h+.05,.04),'walnut',.008,g);cube('Art mount',(0,0,.024),(w,h,.006),'cream',.003,g)
 cube('ArtImage',(0,0,.029),(w-.07,h-.08,.002),['ink','gold','teal'][i],0,g)
 # Graphic shapes: orbital sun, climbing mountains, bonsai silhouette.
 if i==0:
  ell('Poster sun',(0,.14,.034),(.13,.13,.001),'gold',g)
  for k in range(3):curve('Poster orbit',[(math.cos(a/30*math.tau)*(.17+k*.028),math.sin(a/30*math.tau)*(.06+k*.027)-.12,.035) for a in range(31)],.003,'cream',g)
 elif i==1:
  for k in range(3):
   me=bpy.data.meshes.new('Mountain');me.from_pydata([v((-.22+k*.1,-.18,.036+k*.002)),v((-.07+k*.08,.16-k*.03,.036+k*.002)),v((.12+k*.08,-.18,.036+k*.002))],[],[(0,2,1)]);o=bpy.data.objects.new('Mountain',me);bpy.context.collection.objects.link(o);finish(o,'Mountain',['clay','rose','cream'][k],g)
 else:
  curve('Poster trunk',[(0,-.17,.033),(0,.04,.033),(-.10,.13,.033)],.011,'gold',g)
  for k in range(5):ell('Poster tree',(-.08+math.cos(k)*.11,.08+math.sin(k)*.08,.034),(.07,.052,.001),'cream',g)
 text('Art caption',['AFTER HOURS','TAKE THE LONG WAY','SLOW LIVING'][i],(0,-h/2+.055,.034),.024,'cream',g)
# String lights draped across the back, trailing ivy, skateboard and slippers.
curve('String cable',[(-2.72,2.70,-2.25),(-1.45,2.60,-2.25),(0,2.69,-2.25),(1.32,2.60,-2.25),(2.66,2.72,-2.25)],.003,'walnut')
for i in range(23):
 x=-2.65+i*.235;y=2.68-.08*math.sin(i/22*math.pi*2)**2;rod('Fairy socket',(x,y,-2.25),(x,y-.025,-2.25),.006,'walnut');ell('Fairy light',(x,y-.04,-2.25),(.014,.019,.014),'light')
for i in range(13):
 t=i/12;ell('Trailing ivy',(2.53+.035*math.sin(i),1.91-t*.92,-1.90),(.05,.025,.06),'leaf' if i%2 else 'leaf2')
skate=cube('Skateboard',(-2.67,.49,.27),(.14,.87,.037),'gold',.06);skate.rotation_euler.x=-.1
for y in [.20,.76]:
 for z in [.20,.35]:ell('Skate wheel',(-2.64,y,z),(.025,.024,.024),'cream')
for x in [-1.37,-1.13]:ell('Slipper',(x,.057,.24),(.067,.044,.13),'gold')

# Convert curves/fonts, join STATIC islands by material without flattening movables.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if o.type in {'CURVE','FONT'}:o.select_set(True)
if bpy.context.selected_objects:
 bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.convert(target='MESH')
# Named top-level islands preserve semantics. Merge within each immediate parent.
for parent in [o for o in bpy.data.objects if o.type=='EMPTY']:
 meshes=[o for o in parent.children if o.type=='MESH' and not o.data.shape_keys and o.name not in {'ComputerSurface','TVSurface','ArtImage'}]
 bymat={}
 for o in meshes:bymat.setdefault(o.data.materials[0].name,[]).append(o)
 for name,items in bymat.items():
  if len(items)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();items[0].name=parent.name+'_'+name
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(R/'public/models/studio/bedroom.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_apply=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(R/'artifacts/studio/bedroom.blend'))
print('STUDIO EXPORTED')
