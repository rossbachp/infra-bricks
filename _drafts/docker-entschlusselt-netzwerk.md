---
layout: post
title: "Docker entschlüsselt: Netzwerk"
modified: 2014-06-24 18:15:33 +0200
tags: [draft, docker, network, pipework, andreasschmidt ]
category: Docker
links:
  - pipework: https://github.com/jpetazzo/pipework
  - Docker Advanced Networking: https://docs.docker.com/articles/networking/
  - Software Defined Networks: http://www.sflow.org/
  - openvswitch: http://openvswitch.org/
keywords:
  - pipework
  - docker
  - network
---

Wenn man mit Docker experimentiert, kann man außerordnetlich schnelle Erfolge erzielen.
Der Docker-Daemon sorgt im Hintergrund dafür, dass viele notwendige Dinge wie Dateisysteme
und Netzwerk einfach geregelt sind. So wundert man sich auch nicht, dass ein neu gebauter
Container Netzwerkzugriff ins Internet hat, um z.B. Pakete nach zu installieren.

Aber wie funktioniert das eigentlich genau? In diesem Post möchten wir das Thema Netzwerk mit Docker ein wenig beleuchten.

Die Beispiele gehen von einem Ubuntu 14.04 LTS mit installiertem und lauffähigem Docker aus. Der [boot2docker Post]({% post_url 2014-06-30-docker-mit-boot2docker-starten %}) erklärt, wie man mit Hilfe von boot2docker schnell eine Docker-Spielwiese aufbauen kann.

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


D.h. es gibt ein `Loopback`-Interface und ein `eth0`-Netzwerkinterface. Das hat auch bereits eine IP-Adresse aus der Default-Range `172.17.0.0/16`, nämlich die `.2` Auf dem Interface kann der Container in die Welt nach draußen sprechen, da es eine entsprechende Default-Route über eine IP `172.17.42.1` gibt:

```bash
root@4de56414033f:/# ip ro show
default via 172.17.42.1 dev eth0
172.17.0.0/16 dev eth0  proto kernel  scope link  src 172.17.0.2

root@4de56414033f:/# ping www.google.de
PING www.google.de (173.194.70.94) 56(84) bytes of data.
64 bytes from fa-in-f94.1e100.net (173.194.70.94): icmp_seq=1 ttl=61 time=19.8 ms
64 bytes from fa-in-f94.1e100.net (173.194.70.94): icmp_seq=2 ttl=61 time=21.4 ms
^C
--- www.google.de ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 19.879/20.670/21.461/0.791 ms
```


## Was ist eigentlich `docker0`? ...

Auf dem Host kümmert sich der Docker-Daemon um die Netzwerk-Magic. Bei Installation wird eine Linux Bridge `docker0` angelegt.
Eine Bridge ist eine Verküpfung von mehreren Netzwerkinterfaces, die darüber miteinander kommunizieren können.
Die Bridge leitet erst einmal alle Pakete an alle angeschlossenen Interfaces weiter.

```bash
~# sudo ip addr show docker0
4: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 16:69:e4:75:45:86 brd ff:ff:ff:ff:ff:ff
    inet 172.17.42.1/16 scope global docker0
       valid_lft forever preferred_lft forever
```


Dabei hat der Host eine IP-Adresse auf der Bridge, `default: 172.17.42.1`. Das war auch das Ziel der Default-Route aus dem Container!

Jeder Container wird mit seinem Interface an diese Bridge angebunden:

```bash
~# sudo brctl show
bridge name	bridge id		STP enabled	interfaces
docker0		8000.1669e4754586	no		vethc3cd
```


In der rechten Spalte werden die an die Bridge angeschlossenen Interfaces angezeigt. Das sieht zugegebermaßen etwas seltsam aus, ein `veth`-Interface. Man kann sich die Details anzeigen lassen:

```bash
~# sudo ip addr show vethc3cd
38: vethc3cd: <BROADCAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast master docker0 state UP group default qlen 1000
    link/ether 76:c0:d8:ea:50:4d brd ff:ff:ff:ff:ff:ff
    inet6 fe80::74c0:d8ff:feea:504d/64 scope link
       valid_lft forever preferred_lft forever
```


Es handelt sich quasi um ein virtuelles Kabel, dessen Gegenstelle das `eth0`-Interface des Containers darstellt. Das lässt sich auch mit Linux-Bordmitteln herausfinden:

```bash
~# sudo ethtool -S vethc3cd
NIC statistics:
     peer_ifindex: 37
```


`ethtool` zeigt an, dass der Index des Peers zu `vethc3cd` den Identifier `37` trägt. Und das ist genau die ID, die im Container selber beim `eth0` angezeigt wird (s.o.). D.h. es ergibt sich folgendes Bild:

![docker_network_basics1]({{ site.BASE_PATH }}/assets/images/docker_network_basics1.png)


## Anschluss in die Welt da draußen

Mit dem Kommando `brctl` kann man sehen, dass nur ein Interface auf der Bridge angeschlossen ist, nämlich das `veth...`-Interface. Allerdings ist das Netzwerk-Interface des Hosts (im Diagramm das obere `eth0`) nicht an der Bridge angeklemmt. Das wäre auch möglich, braucht aber einige weitere Voraussetzungen und Umbauarbeiten, die z.B. [im Blog von @jpetazzo](http://jpetazzo.github.io/2013/10/16/configure-docker-bridge-network/) beschrieben sind.

Wie also kann der Container Pakete ins Internet schicken und die Antworten erhalten? Der Docker-Daemon baut dafür auf dem Host einen NAT-Automatismus mit Hilfe von `iptables` auf. In der Prerouting- und Routing-Chain wird klar, dass ein Paket nach außen geroutet werden soll.

```bash
~# sudo /sbin/iptables -L -n -t nat
[....]

Chain POSTROUTING (policy ACCEPT)
target     prot opt source               destination
MASQUERADE  all  --  172.17.0.0/16       !172.17.0.0/16
```


In der Postrouting-Chain gibt es einen Masquerade-Eintrag. Dabei setzt der Host Paketen, die für die Außenwelt bestimmt sind, die eigene IP des ausgehenden Interfaces ein, sodass die Antworten später auch zurückgeroutet werden können.

## Kommunikation zwischen den Docker-Containern auf dem selben Host

Da alle Container auf derselben Bridge lokalisiert sind, können sie darauf auch untereinander kommunizieren.
Das Prinzip wurde in der LINK-Funktionalität von Docker Containern weiter ausgebaut.

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

Die [Link-Funktionalität](https://docs.docker.com/userguide/dockerlinks/) von Docker macht das einfach
sehr einfach zugänglich, da man Container anhand ihres Namens und einer Port-Nummer untereinander verknüpfen kann:

![docker_network_basics2_link]({{ site.BASE_PATH }}/assets/images/docker_network_basics2_link.png)


## Docker-Container für die Aussenwelt erreichbar machen

Im Dockerfile hat man mit EXPOSE die Möglichkeit, einen lokalen Port des Containers auf dem Host weiterzuleiten, sodass er auch von außen erreichbar ist. Da die `docker0`-Bridge aber nicht mit dem Host-Interface verbunden ist gibt es auch hierbei einen iptables-Mechanismus.

Alternativ kann man im `docker run`-Befehl direkt eine Weiterleitung einrichten. Das Beispiel zeigt, wie ein Container mit einer Weiterleitung gestartet wird, ein Netcat-Listen Prozess hört auf dem (inneren Container-)Port 80.

```bash
~# docker run -t -i -p 80:8000 ubuntu /bin/bash
root@e5d717bdfc32:/# nc -l 0.0.0.0 80
```

Falls `nc` nicht installiert ist, hilft ein `apt-get install netcat`.

Auf dem Host kann man sich die Weiterleitung von Docker anzeigen lassen. Über `netstat` sieht man, dass der Docker-Daemon auf dem weitergeleiteten Port hört:

```bash
~# docker port 28096eac487b 80
0.0.0.0:8000
~# netstat -nltp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
[...]
tcp6       0      0 :::8000                 :::*                    LISTEN      6062/docker.io
```

Und auf dem Host wird eine iptables Forward-Regel eingerichtet, damit der Traffic, der vom Host-Interface ankommt, über die Bridge an den Container gerichtet werden kann:

```bash
~# sudo /sbin/iptables -L -n
Chain INPUT (policy ACCEPT)
target     prot opt source               destination

Chain FORWARD (policy ACCEPT)
target     prot opt source               destination
ACCEPT     tcp  --  0.0.0.0/0            172.17.0.2           tcp dpt:80
```

## Im Detail ...

Der Docker-Daemon sorgt hinter den Kulissen dafür, dass allen drehenden Teile auch richtig zusammenarbeiten. Bei der normalen Arbeit mit Docker muss man sich darum selten kümmern. Mit Docker ist man aber auch in der Lage, komplexere Netzwerk-Setups zu simulieren und damit eine Docker-Umgebung produktionsreif aufzubauen.

Wer das ganze im Detail nachlesen möchte, ist auf der Docker.io Dokumentation-Seite zu [Advanced Networking](https://docs.docker.com/articles/networking/) gut aufgehoben.

Im nächsten Schritt werden wir Container über Hostgrenzen hinweg verbinden und damit die Grundlage für ein skalierfähige und ausfallsichere Umgebungen zu schaffen. Das Thema *Software Defined Networks* ist sicherlich komplex, aber nun gibt es endlich eine interessante praktische Verwendung für jeden von uns Docker infizierten.

--
Andreas
