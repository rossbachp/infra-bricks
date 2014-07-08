---
layout: post
title: "Docker entschlüsselt: Netzwerk"
modified: 2014-07-06 20:17:00 +0200
tags: [docker, network, pipework, andreasschmidt, peterrossbach ]
category: Docker
links:
  - Die Linux Bridge: http://www.linuxfoundation.org/collaborate/workgroups/networking/bridge
  - 100 VMS mit Docker auf einem Host laufen lassen: https://blog.codecentric.de/2014/01/leichtgewichtige-virtuelle-maschinen-mit-docker-oder-wie-man-100-vms-laufen/
  - Docker Networking: http://www.jedelman.com/home/docker-networking
  - Docker Advanced Networking: https://docs.docker.com/articles/networking/
  - pipework: https://github.com/jpetazzo/pipework
keywords:
  - pipework
  - docker
  - network
---

Wenn man mit Docker experimentiert, kann man außerordentlich schnelle Erfolge erzielen.
Der Docker-Daemon sorgt im Hintergrund dafür, dass viele notwendige Dinge wie Dateisysteme
und Netzwerk einfach geregelt sind. So wundert man sich auch nicht, dass ein neu gebauter
Container Netzwerkzugriff ins Internet hat, um z.B. Pakete zu installieren.

Aber wie funktioniert das eigentlich genau? In diesem Post möchten wir das Thema Netzwerk mit Docker ein wenig beleuchten.

Die Beispiele gehen von einem Ubuntu 14.04 LTS mit installiertem und lauffähigem Docker aus. Der
[boot2docker Post]({% post_url 2014-06-30-docker-mit-boot2docker-starten %}) erklärt, wie man mit Hilfe von boot2docker
schnell eine Docker-Spielwiese aufbauen kann. Da im [Tiny Linux](http://distro.ibiblio.org/tinycorelinux/) zur Zeit das
Tooling für das Netzwerk fehlt, haben wir uns entschlossen lieber direkt eine eigene Linux Installation mit Vagrant und
Virtualbox aufzusetzen. Unser Projekt [dockerbox](https://github.com/rossbachp/dockerbox) erfüllt diesen Zweck.

## Das Netzwerk im Docker-Container

Wenn man einen einfachen Container mit einer Shell als Prozess startet, kann man im Container
und auf dem Host nachschauen, was sich netzwerktechnisch dort abspielt:

```bash
~# docker run -t -i ubuntu /bin/bash
root@4de56414033f:/# ip addr show
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN group default
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
37: eth0: <BROADCAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether e2:47:24:55:de:d4 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.2/16 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::e047:24ff:fe55:ded4/64 scope link
       valid_lft forever preferred_lft forever
```


D.h. es gibt ein `Loopback`-Interface und ein `eth0`-Netzwerkinterface im Docker Container.
Das `eth0`-Interface hat auch bereits eine IP-Adresse aus der Default-Range `172.17.0.0/16`,
nämlich die `.2`. Damit der Container "nach draußen" sprechen kann, benötigt er eine
Route aus seiner Umgebung heraus über den Host ins Internet. Mit dem Befehl `ip` kann man
sich Routen auch im Container anzeigen lassen. Man sieht, dass es eine entsprechende
Default-Route mit der IP `172.17.42.1` angelegt ist:

```bash
root@4de56414033f:/# ip ro show
default via 172.17.42.1 dev eth0
172.17.0.0/16 dev eth0  proto kernel  scope link  src 172.17.0.2

root@4de56414033f:/# ping www.infrabricks.de
PING github.map.fastly.net (185.31.17.133) 56(84) bytes of data.
64 bytes from github.map.fastly.net (185.31.17.133): icmp_seq=1 ttl=61 time=46.2 ms
64 bytes from github.map.fastly.net (185.31.17.133): icmp_seq=2 ttl=61 time=46.8 ms
64 bytes from github.map.fastly.net (185.31.17.133): icmp_seq=3 ttl=61 time=44.5 ms
^C
--- github.map.fastly.net ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 44.555/45.891/46.823/0.968 ms
```


## Was ist eigentlich die Bridge `docker0`? ...

Auf dem Host kümmert sich der Docker-Daemon um die Netzwerk-Magic. Bei Installation wird eine Linux Network Bridge `docker0` angelegt.
Eine Bridge erscheint erstmal wie ein eigenes Netzwerkinterfaces, im Fall von
`docker0` besitzt diese Bridge sogar eine eigene IP-Adresse. Man kann sich
eine Bridge vorstellen wie das virtuelle Äquivalent eines Hardware-Switches, aber
ohne eigene Logik (die ein Switch hätte). Andere Netzwerkinterfaces können an
eine Bridge angeschlossen werden, und der Kernel (das Modul bridge) leitet
Pakete, die auf beliebigen Interfaces ankommen an alle angeschlossenen Interfaces weiter.

Mit dem `ip`-Kommando kann man die Bridge als Interface (mit ihrer IP) sehen:

```bash
~# sudo ip addr show docker0
4: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 16:69:e4:75:45:86 brd ff:ff:ff:ff:ff:ff
    inet 172.17.42.1/16 scope global docker0
       valid_lft forever preferred_lft forever
```

Das Tool `brctl` zeigt die Interfaces an, die an die Bridge angeschlossen sind.
Es stammt aus dem Paket `bridge-utils`.

```bash
~# sudo brctl show
bridge name	bridge id		STP enabled	interfaces
docker0		8000.1669e4754586	no		vethc3cd
```


In der letzten, rechten Spalte werden die an die Bridge angeschlossenen Interfaces angezeigt.
Das sieht zugegebermaßen etwas seltsam aus, ein `veth`-Interface. Man kann sich die Details anzeigen lassen:

```bash
~# sudo ip addr show vethc3cd
38: vethc3cd: <BROADCAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast master docker0 state UP group default qlen 1000
    link/ether 76:c0:d8:ea:50:4d brd ff:ff:ff:ff:ff:ff
    inet6 fe80::74c0:d8ff:feea:504d/64 scope link
       valid_lft forever preferred_lft forever
```

Es handelt sich quasi um ein virtuelles Kabel, das an der Bridge hängt (in der
  ersten Ausgabezeile zu sehen, `master docker0`). Dieses Interface ist
die Gegenstelle des `eth0`-Interface im Containers.
Das lässt sich auch mit Linux-Bordmitteln herausfinden, wir bemühen die Statistik-Funktion
von `ethtool` und finden heraus:

```bash
~# sudo ethtool -S vethc3cd
NIC statistics:
     peer_ifindex: 37
```

`ethtool` zeigt an, dass der Index des Peers zu `vethc3cd` den Identifier `37` trägt. Und das
ist genau die ID, die im Container selber beim `eth0` angezeigt wird (s.o.). D.h. es ergibt sich folgendes Bild:

![docker_network_basics1]({{ site.BASE_PATH }}/assets/images/docker_network_basics1.png)

Das veth-Interface auf dem Host und das eth-Interface im Container sind wie die beiden
Seiten derselben (Netzwerk-)Medaille. Alles was der eine transportiert, sieht der andere
auch, nur in verschiedenen Container- bzw. Namespace-Ebenen. So trennt Docker
das äußere Host-Interface vom inneren Container-Interface.

## Anschluss in die Welt da draußen

Mit dem Kommando `brctl` kann man sehen, dass nur ein Interface auf der Bridge angeschlossen ist,
nämlich das `veth...`-Interface. Allerdings ist das Netzwerk-Interface des Hosts (im Diagramm das obere `eth0`)
nicht an der Bridge angeklemmt. Das wäre auch möglich, braucht aber einige weitere Voraussetzungen
und Umbauarbeiten, die z.B. [im Blog von @jpetazzo](http://jpetazzo.github.io/2013/10/16/configure-docker-bridge-network/)
beschrieben sind.

Wie also kann der Container Pakete ins Internet schicken und die Antworten erhalten? Der Docker-Daemon
baut dafür auf dem Host einen Automatismus mit Hilfe von `iptables` auf. In der Prerouting- und
Routing-Chain wird klar, dass ein Paket nach außen geroutet werden soll.

```bash
~# sudo /sbin/iptables -L -n -t nat
[....]

Chain POSTROUTING (policy ACCEPT)
target     prot opt source               destination
MASQUERADE  all  --  172.17.0.0/16       !172.17.0.0/16
```

In der Postrouting-Chain gibt es einen Masquerade-Eintrag. Dabei setzt der Host Paketen, die für die Außenwelt bestimmt sind, die eigene IP des ausgehenden Interfaces ein, sodass die Antworten später auch zurückgeroutet werden können.

Mit dem Aufruf eines traceroute-Tools (hier `mtr-tiny`, kann auch ein anderes Tool sein) im Docker-Container sieht man,
dass alle Netzpakete automatisch über die IP des
Hosts geroutet werden, die an der `docker0`-Bridge hängt (172.17.42.1). Da die Bridge nicht am `eth0` des Host hängt,
gibt es keine direkten Weg nach draußen. Aber das IP-Masquerade und das Routing auf dem Host sorgen dafür, dass der
nächste (2.) Hop die `eth0` auf dem Host ist (10.0.2.2). Danach geht es weiter über die Netzinfrastruktur, an der
der Host hängt.

```bash
root@4de56414033f:/# apt-get install mtr-tiny
root@4de56414033f:/# mtr www.infrabricks.de
                                     My traceroute  [v0.85]
2ad667affd45 (0.0.0.0)                                                 Thu Jul  3 16:37:37 2014
Keys:  Help   Display mode   Restart statistics   Order of fields   quit
                                                       Packets               Pings
 Host                                                Loss%   Snt   Last   Avg  Best  Wrst StDev
 1. 172.17.42.1                                       0.0%     6    0.1   0.1   0.1   0.3   0.0
 2. 10.0.2.2                                          0.0%     6    0.4   0.5   0.4   0.9   0.0
 3. ???
 ...
11. ???
12. github.map.fastly.net                             0.0%     5   44.1  44.1  43.9  44.4   0.0

```

## Kommunikation zwischen den Docker-Containern auf dem selben Host

Da alle Docker-Container auf derselben Bridge `docker0` lokalisiert sind, können sie darauf uneingeschränkt untereinander kommunizieren.
Das Prinzip wurde in der LINK-Funktionalität vom Docker-Daemon weiter ausgebaut.

Ein zweiter Container erhält eine neue IP und ist der in der Lage, den ersten zu erreichen:

```bash
~# docker run -t -i ubuntu /bin/bash
root@2e2d98cf5c43:/# ip addr show eth0
39: eth0: <BROADCAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 16:47:b2:34:b1:87 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.5/16 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::1447:b2ff:fe34:b187/64 scope link
       valid_lft forever preferred_lft forever
       root@2e2d98cf5c43:/# ping 172.17.0.2
PING 172.17.0.2 (172.17.0.2) 56(84) bytes of data.
64 bytes from 172.17.0.2: icmp_seq=1 ttl=64 time=0.099 ms
64 bytes from 172.17.0.2: icmp_seq=2 ttl=64 time=0.091 ms
64 bytes from 172.17.0.2: icmp_seq=3 ttl=64 time=0.080 ms
^C
--- 172.17.0.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2001ms
rtt min/avg/max/mdev = 0.080/0.090/0.099/0.007 ms
```


Das funktioniert, weil der Docker-Daemon in Default-Verhalten keine iptables-Sperren auf der Bridge
einrichtet, d.h. alle Container können untereinander und mit dem Host auf allen offenen Ports kommunizieren.

Falls man das aus Sicherheitsgründen nicht möchte, kann man dieses [Verhalten ändern](https://docs.docker.com/articles/networking/#between-containers). Dabei sorgt eine andere Default-Policy im iptables dafür, das Pakete verworfen werden, außer es wird explizit erlaubt.

![docker_network_basics_host]({{ site.BASE_PATH }}/assets/images/docker_network_basics_host.png)


## Docker-Container für die Aussenwelt erreichbar machen

Die [Link-Funktionalität](https://docs.docker.com/userguide/dockerlinks/) von Docker macht das einfach
sehr einfach zugänglich, da man Container anhand ihres Namens und einer Port-Nummer untereinander verknüpfen kann:

![docker_network_basics2_link]({{ site.BASE_PATH }}/assets/images/docker_network_basics2_link.png)

Im Dockerfile hat man mit EXPOSE die Möglichkeit, einen lokalen Port des Containers auf dem Host weiterzuleiten, sodass er auch von außen erreichbar ist. Da die `docker0`-Bridge aber nicht mit dem Host-Interface verbunden ist gibt es auch hierbei einen iptables-Mechanismus.

Alternativ kann man im `docker run`-Befehl direkt eine Weiterleitung einrichten. Das Beispiel zeigt, wie ein Container mit einer Weiterleitung gestartet wird, ein Netcat-Listen Prozess hört auf dem *inneren* Container-Port 80.

```bash
~# docker run -t -i -p 80:8000 ubuntu /bin/bash
root@e5d717bdfc32:/# nc -l 0.0.0.0 80
```

Falls `nc` nicht installiert ist, hilft ein `apt-get install netcat`.

Auf dem Host kann man sich die Weiterleitung von Docker anzeigen lassen (`docker port`).
Über `netstat` sieht man, dass der Docker-Daemon auf dem weitergeleiteten Port hört:

```bash
~# docker port 28096eac487b 80
0.0.0.0:8000
~# netstat -nltp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
[...]
tcp6       0      0 :::8000                 :::*                    LISTEN      6062/docker.io
```

Und auf dem Host wurde eine iptables Forward-Regel eingerichtet, damit der Traffic, der vom Host-Interface ankommt,
über die Bridge an den Container gerichtet werden kann:

```bash
~# sudo /sbin/iptables -L -n
Chain INPUT (policy ACCEPT)
target     prot opt source               destination

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination
ACCEPT     tcp  --  0.0.0.0/0            172.17.0.2           tcp dpt:80
```

## Im Detail ...

Der Docker-Daemon sorgt hinter den Kulissen dafür, dass alle *drehenden* Teile auch
richtig zusammenarbeiten. Bei der normalen Arbeit mit Docker muss man sich darum selten
kümmern. Mit Docker ist man aber auch in der Lage, komplexere Netzwerk-Setups zu simulieren
und damit eine Docker-Umgebung produktionsreif aufzubauen.

Wer das ganze im Detail nachlesen möchte, ist auf der Docker.io Dokumentation-Seite
zu [Advanced Networking](https://docs.docker.com/articles/networking/) gut aufgehoben.

Im nächsten Schritt werden wir Container über Hostgrenzen hinweg verbinden und damit die Grundlage
für ein skalierfähige und ausfallsichere Umgebungen zu schaffen. Jede Menge Posts erscheinen nun
zum Thema Docker bzw. Linux Networking. Lukas Pustina zeigte in seinem
[Post](https://blog.codecentric.de/2014/01/leichtgewichtige-virtuelle-maschinen-mit-docker-oder-wie-man-100-vms-laufen/) wie
einfach es ist, hundert Docker Container auf einem Host zu starten. Jason Edelman schreibt
regelmässig über das Thema Networking und sein Artikel über Docker
mit [Open vSwitch] (http://www.jedelman.com/home/open-vswitch-201-301) zu verbinden, gibt viele Anregungen.

Das Thema *Software Defined Networks* ist komplex, aber nun gibt es endlich eine interessante
praktische Verwendung für jeden von uns Docker-Interessierten.



--
Andreas & Peter
