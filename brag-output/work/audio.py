import numpy as np, wave
SR=48000; DUR=21.0; N=int(SR*DUR)
BAR=1.05; BEAT=BAR/3
L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
NOTE={'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
def hz(n):
    name=n[:-1]; o=int(n[-1]); return 440*2**((NOTE[name]+12*(o+1)-69)/12)
def add(sig,t,gain=1.0,pan=0.0):
    i=int(t*SR); j=min(N,i+len(sig)); s=sig[:j-i]*gain
    L[i:j]+=s*np.sqrt((1-pan)/2)*1.414/1.414; R[i:j]+=s*np.sqrt((1+pan)/2)
def env(n,a,d):
    t=np.arange(n)/SR; return np.minimum(1,t/a)*np.exp(-t/d)
def piano(f,dur,vel=1.0,bright=1.0):
    n=int(SR*(dur+1.2)); t=np.arange(n)/SR
    s=np.zeros(n)
    for k,(amp,dec) in enumerate([(1,1.0),(0.45*bright,0.6),(0.22*bright,0.35),(0.1*bright,0.22),(0.05*bright,0.15)],1):
        s+=amp*np.sin(2*np.pi*f*k*t*(1+0.0004*k))*np.exp(-t/(dec*(1.2 if f<300 else 0.9)))
    e=np.minimum(1,t/0.004)
    rel=np.where(t>dur, np.exp(-(t-dur)/0.18),1)
    return s*e*rel*vel
def bass(f,dur):
    n=int(SR*(dur+0.5)); t=np.arange(n)/SR
    s=np.sin(2*np.pi*f*t)+0.25*np.sin(2*np.pi*2*f*t)+0.08*np.sin(2*np.pi*3*f*t)
    return s*np.minimum(1,t/0.01)*np.exp(-t/0.55)*np.where(t>dur,np.exp(-(t-dur)/0.1),1)
def pad(freqs,dur):
    n=int(SR*dur); t=np.arange(n)/SR; s=np.zeros(n)
    for f in freqs:
        for det in (-0.6,0.6): s+=np.sin(2*np.pi*(f+det)*t)+0.15*np.sin(2*np.pi*2*(f+det)*t)
    a=np.minimum(1,t/0.35)*np.minimum(1,(dur-t)/0.35)
    return s*a/len(freqs)
def noise(n): return rng.standard_normal(n)
def lowpass(x,a):  # one-pole
    y=np.empty_like(x); acc=0.0
    for i in range(len(x)): acc+=a*(x[i]-acc); y[i]=acc
    return y
def hp(x,a): return x-lowpass(x,a)

CH={'D':['D','F#','A'],'Bm':['B','D','F#'],'G':['G','B','D'],'A':['A','C#','E'],'F#m':['F#','A','C#']}
ROOT={'D':'D2','Bm':'B1','G':'G2','A':'A2','F#m':'F#2'}
VOICE={'D':['F#4','A4','D5'],'Bm':['F#4','B4','D5'],'G':['G4','B4','D5'],'A':['E4','A4','C#5'],'F#m':['F#4','A4','C#5']}
prog=['D','Bm','G','A', 'D','F#m','G','A', 'Bm','G','D','A', 'G','A','Bm','A', 'D','G','D','D']
mel={4:[('F#5',0,2),('A5',2,1)],5:[('C#6',0,2),('A5',2,1)],6:[('B5',0,1),('D6',1,1),('B5',2,1)],7:[('A5',0,3)],
 8:[('D6',0,2),('B5',2,1)],9:[('G5',0,2),('B5',2,1)],10:[('A5',0,1),('F#5',1,1),('D5',2,1)],11:[('E5',0,3)],
 12:[('B5',0,2),('D6',2,1)],13:[('C#6',0,2),('E6',2,1)],14:[('D6',0,1),('F#6',1,1),('D6',2,1)],15:[('C#6',0,2),('A5',2,1)],
 16:[('D6',0,3)],17:[('B5',0,1.5),('A5',1.5,1.5)]}
for b,c in enumerate(prog):
    t0=b*BAR
    last = b>=18
    if b<19:
        add(bass(hz(ROOT[c]), BEAT*1.6),t0,0.32)
    else:
        add(bass(hz(ROOT[c]), BAR*2),t0,0.3)
    vel = 0.18 if b<4 else 0.22
    if b<19:
        for beat in (1,2):
            for k,n in enumerate(VOICE[c]): add(piano(hz(n),BEAT*0.7,vel*(0.9 if beat==2 else 1),0.6),t0+beat*BEAT+0.004*k,1,-0.25+0.25*k)
    else:
        for k,n in enumerate(VOICE[c]+['D4']): add(piano(hz(n),BAR*2,0.2,0.5),t0+0.02*k,1,-0.25+0.2*k)
    add(pad([hz(n[:-1]+str(int(n[-1])-1)) for n in VOICE[c]],BAR+0.2),t0,0.05 if b<4 else 0.075)
    for (n,bt,d) in mel.get(b,[]): add(piano(hz(n),BEAT*d*0.95,0.42,1.0),t0+bt*BEAT,1,0.12)
    # brushed shaker from scene 2 on
    if 4<=b<19:
        for beat in (1,2):
            n=int(SR*0.12); s=hp(noise(n),0.35)*env(n,0.01,0.035)
            add(s,t0+beat*BEAT,0.03,0.4)
# ---------- SFX (in key, soft) ----------
pent=['D6','E6','F#6','A6','B6']
TYPED='Ballroom Dance (Standard)'
for i,ch in enumerate(TYPED):
    if ch==' ': continue
    t=0.95+i*0.062
    n=int(SR*0.09); tt=np.arange(n)/SR
    s=np.sin(2*np.pi*hz(pent[i%5])*tt)*np.exp(-tt/0.025)
    s+=0.5*hp(noise(n),0.5)*np.exp(-tt/0.006)
    add(s,t,0.05,0.15)
def click(t,g=0.18):
    n=int(SR*0.25); tt=np.arange(n)/SR
    s=np.sin(2*np.pi*hz('A5')*tt)*np.exp(-tt/0.05)+0.6*np.sin(2*np.pi*hz('D5')*tt)*np.exp(-tt/0.08)
    s+=0.4*hp(noise(n),0.6)*np.exp(-tt/0.004)
    add(s,t,g,0.1)
click(0.74); click(0.95+25*0.062+0.28,0.2)   # click cell, Enter
click(8.4+2.15,0.2)                          # Add to calendar
def whoosh(tc,dur=0.7,g=0.09):
    n=int(SR*dur); tt=np.arange(n)/SR
    shape=np.sin(np.pi*tt/dur)**2
    s=hp(lowpass(noise(n),0.08),0.03)*shape
    add(s,tc-dur/2,g,0); add(hp(lowpass(noise(n),0.08),0.03)*shape,tc-dur/2,g*0.8,0.6)
for c in (4.2,8.4,12.6,16.8): whoosh(c)
for c in (12.6+1.45,12.6+2.7): whoosh(c,0.45,0.05)
# chime on the logo
for k,(n,dt) in enumerate([('D6',0),('A6',0.09),('D7',0.18),('F#6',0.27)]):
    nn=int(SR*2.5); tt=np.arange(nn)/SR; f=hz(n)
    s=(np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt/0.3))*np.exp(-tt/1.1)*np.minimum(1,tt/0.003)
    add(s,16.8+0.25+dt,0.07,-0.3+0.2*k)
# ---------- reverb ----------
def ir(seed):
    r=np.random.default_rng(seed); n=int(SR*1.8); t=np.arange(n)/SR
    x=r.standard_normal(n)*np.exp(-t/0.45); x=lowpass(x,0.25); x[:int(SR*0.02)]=0; return x/np.sqrt((x**2).sum())
def conv(x,h):
    m=len(x)+len(h)-1; F=1<<int(np.ceil(np.log2(m)))
    return np.fft.irfft(np.fft.rfft(x,F)*np.fft.rfft(h,F),F)[:len(x)]
A=lambda fc:1-np.exp(-2*np.pi*fc/SR)
wL=conv(hp(L,A(250)),ir(1)); wR=conv(hp(R,A(250)),ir(2))
L2=hp(L+0.3*wL,A(35)); R2=hp(R+0.3*wR,A(35))
# fade tail
fade=np.ones(N); fn=int(SR*0.9); fade[-fn:]=np.linspace(1,0,fn)**1.5
fi=int(SR*0.02); fade[:fi]=np.linspace(0,1,fi)
L2*=fade; R2*=fade
st=np.stack([L2,R2],1); st=np.tanh(st/np.abs(st).max()*1.2)/np.tanh(1.2)*0.89
with wave.open('audio.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype('<i2').tobytes())
print('ok')
