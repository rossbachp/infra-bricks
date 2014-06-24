---
layout: post
title: "Docker mit boot2docker starten"
modified: 2014-06-22 20:00:05 +0200
tags: [draft, docker]
category: docker
links:
  - Boot2Docker: http://boot2docker.io
  - Docker: http://docker.io
  - LXC: https://linuxcontainers.org/
keywords:
  - docker
  - boot2Docker
  - virtualbox
---

Das Projekt Docker schlägt seit den ersten Lebenszeichen Mitte letzten Jahres zunehmend höhere Bekannheits- und auch Begeisterungswellen. Docker verspricht einen schneller Start, flexible Konfiguration und stabile Images. Beides sind für uns sehr wichtige Vorausetzungen um Infrastruktur testbar zu machen. Grund genug für uns, das ganze unter die Lupe zu nehmen und Euch einfache Anleitungen zum Ausprobieren an die Hand zu geben. Wie kann man am einfachsten mit Docker  auf dem eigene Rechner durchstarten?

## Erste Schritte mit Docker

[Docker](http://docker.io) ermöglicht es die eigenen Prozesse in leichtgewichtige [Linux Container](https://linuxcontainers.org/) einzupacken. Am besten kann man die Wirkung als eine fettreduzierte Virtualisierung beschreiben. Wer Docker direkt probieren möchte, kann das [Online Tutorial](http://www.docker.com/tryit/) nutzen. Eine eigene Installation ist für einen echten Docker-Einsatz allerdings unerlässlich. Damit dies auf dem eigenen Rechner zuverlässig gelingt, empfiehlt sich die lokale Installation mit dem Projekt [boot2docker](http://boot2docker.io).

![boot2docker]({{ site.BASE_PATH }}/assets/images/boot2docker.png)

Mit der Hilfe von Boot2Docker wird auf dem eigene Windows oder Mac eine virtuelle Maschine mit einer Basis-Docker Linux Installation installiert. Die Voraussetzung ist die Installation eines aktuellen Version von VirtualBox. Weiterhin wird die Docker Client CLI und eine boot2docker Management CLI installiert. So läßt sich anschliessend sehr bequem sämtliche Administration ohne lästiges einloggen via ssh vom eigene Rechner erledigen. Docker selbst benötigt Zugang zu dem [Cloud Images Registry von Docker Inc](https://registry.hub.docker.com/). Von dort werden die Betriebsysteme und Container geladen. Aktuell befinden sich dort schon mehr als 15.000 vorgefertige Container für die unterschiedliches Einsatzzwecke. Die Qualität ist unterschiedlich und vor dem Einsatz lohnt sich ein Blick in die Sourcen des Containers. Die Konfiguration eines Container befindet sich in der Datei `Dockerfile`.

Die grössten Unterschiede zwischen Vagrant und Docker sind:

 |Vagrant| Docker
------|-------|--------
*Nutzung* | Entwicklung | Entwicklung und Betrieb
*Speicherung* | Dauerhaft | Flüchtig und braucht externe Volumes
*Anzahl der Services* | viele | meist einer
*Programmierung* | Ruby | Bash
*Technik* | Virtualisierung | LXC

## Installation von boot2docker

[Boot2docker](http://boot2docker.io/) hilft dabei, ein passendes Linux mit Virtualbox auf Windows oder OS X zu installieren. Mit der Version 1.0 liegt die Installation nun als fertiges Package vor. Als Voraussetzung muss [VirtualBox](https://www.virtualbox.org/) in der Version `>4.3.12` installiert sein. Eine leistungsfähige Internet-Verbindung, die schnell den Transfer von 1GB Daten erlaubt, ist hier wirklich hilfreich. Eine Live-Demo mit unbekannten langsamen WiFi-Netzen oder Mobiles hat der Demo-Gott hier nicht vorgesehen. Denn zum Start muss neben dem Images für die Virtualisierung noch die Basis-Images für Docker geladen werden. Also ist genügend Zeit für ein bisschen Lesen im Netz oder eine Unterhaltung mit den Kollegen.

  - [Docker User Guide](https://docs.docker.com/userguide/)
  - [Docker Basics](https://docs.docker.com/articles/basics/)

![boot2docker]({{ site.BASE_PATH }}/assets/images/boot2docker-install.png)

Neben der VM wird auf dem Host ein lokaler Docker-Client installiert, damit ohne  Login auf dem Linux alle Docker-Befehle genutzt werden können. Nach dem Installation von boot2Docker kann geprüft werden, ob der Docker-Client auf dem Host verfügbar ist.

```bash
$ docker version
Docker version 1.0.1, build 990021a
```

Die eigene Docker-Testumgebung wird mit dem Befehl `boot2docker init` erzeugt. Dabei wird eine neue virtuelle Maschine in der VirtualBox erstellt. Der Start der Umgebung erfolgt mit `boot2docker up`. Wichtig ist, das man nun den Docker-Client auf der eigene Maschine auf der gestartet VM mit ein Export-Anweisung konfiguiert. Die Anweisung befindet sich am Ende der Ausgabe des Kommandos. Nun kann die Fernsteuerung von Docker in der VM beginnen. Dies ist möglich, da Docker ein HTTP REST API besitzt und alles Steuerung darüber erfolgen. Neben der Shell Client gibt es diverse Docker Integration für Ruby, Go, Php, Java, Scala oder Groovy.

```bash
$ boot2docker up
2014/06/22 19:12:29 Waiting for VM to be started...
..^[[C.....
2014/06/22 19:12:50 Started.
2014/06/22 19:12:50 To connect the Docker client to the Docker daemon, please set:
2014/06/22 19:12:50     export DOCKER_HOST=tcp://192.168.59.103:2375

$ export DOCKER_HOST=tcp://192.168.59.103:2375
```

Nun stehen alle Docker Kommandos auf dem eigenen Mac- oder Windows-Rechner zur Verfügung.

```bash
$ docker images
REPOSITORY           TAG                   IMAGE ID            CREATED             VIRTUAL SIZE
busybox              buildroot-2013.08.1   d200959a3e91        2 weeks ago         2.489 MB
busybox              ubuntu-14.04          37fca75d01ff        2 weeks ago         5.609 MB
busybox              ubuntu-12.04          fd5373b3d938        2 weeks ago         5.455 MB
busybox              buildroot-2014.02     a9eb17255234        2 weeks ago         2.433 MB
busybox              latest                a9eb17255234        2 weeks ago         2.433 MB
```

Folgenden `docker`-Kommandos können nun ausführen werden:

```bash
$ docker
Usage: docker [OPTIONS] COMMAND [arg...]
 -H=[unix:///var/run/docker.sock]: tcp://host:port to bind/connect to or unix://path/to/socket to use

A self-sufficient runtime for linux containers.

Commands:
    attach    Attach to a running container
    build     Build an image from a Dockerfile
    commit    Create a new image from a container's changes
    cp        Copy files/folders from the containers filesystem to the host path
    diff      Inspect changes on a container's filesystem
    events    Get real time events from the server
    export    Stream the contents of a container as a tar archive
    history   Show the history of an image
    images    List images
    import    Create a new filesystem image from the contents of a tarball
    info      Display system-wide information
    inspect   Return low-level information on a container
    kill      Kill a running container
    load      Load an image from a tar archive
    login     Register or Login to the docker registry server
    logs      Fetch the logs of a container
    port      Lookup the public-facing port which is NAT-ed to PRIVATE_PORT
    pause     Pause all processes within a container
    ps        List containers
    pull      Pull an image or a repository from the docker registry server
    push      Push an image or a repository to the docker registry server
    restart   Restart a running container
    rm        Remove one or more containers
    rmi       Remove one or more images
    run       Run a command in a new container
    save      Save an image to a tar archive
    search    Search for an image in the docker index
    start     Start a stopped container
    stop      Stop a running container
    tag       Tag an image into a repository
    top       Lookup the running processes of a container
    unpause   Unpause a paused container
    version   Show the docker version information
    wait      Block until a container stops, then print its exit code
```

Mit dem Befehl `boot2docker ssh` ist die Einwahl auf die VM möglich.

```bash
$ boot2docker ssh
Warning: Permanently added '[localhost]:2022' (RSA) to the list of known hosts.
                        ##        .
                  ## ## ##       ==
               ## ## ## ##      ===
           /""""""""""""""""\___/ ===
      ~~~ {~~ ~~~~ ~~~ ~~~~ ~~ ~ /  ===- ~~~
           \______ o          __/
             \    \        __/
              \____\______/
 _                 _   ____     _            _
| |__   ___   ___ | |_|___ \ __| | ___   ___| | _____ _ __
| '_ \ / _ \ / _ \| __| __) / _` |/ _ \ / __| |/ / _ \ '__|
| |_) | (_) | (_) | |_ / __/ (_| | (_) | (__|   <  __/ |
|_.__/ \___/ \___/ \__|_____\__,_|\___/ \___|_|\_\___|_|
boot2docker: 1.0.0
             master : 16013ee - Mon Jun  9 16:33:25 UTC 2014
docker@boot2docker:~$
```

Nun ist eine direkte Interaktion mit allen Container und Prozessen auf dem Linux VM möglich. Weitere Linux Packages für Monitoring, Logging und andere Services können genutzt werden. Natürlich kann nun das Netzwerk für die Kooperation mit anderne Maschinen und Services erweitert werden.

In der Liste der boot2docker Befehle finden sich die üblichen Verdächtigen zum Management der VM:

```bash
$ boot2docker --help
Usage: boot2docker [<options>] <command> [<args>]

boot2docker management utility.

Commands:
    init                    Create a new boot2docker VM.
    up|start|boot           Start VM from any states.
    ssh [ssh-command]       Login to VM via SSH.
    save|suspend            Suspend VM and save state to disk.
    down|stop|halt          Gracefully shutdown the VM.
    restart                 Gracefully reboot the VM.
    poweroff                Forcefully power off the VM (might corrupt disk image).
    reset                   Forcefully power cycle the VM (might corrupt disk image).
    delete                  Delete boot2docker VM and its disk image.
    config|cfg              Show selected profile file settings.
    info                    Display detailed information of VM.
    ip                      Display the IP address of the VM's Host-only network.
    status                  Display current state of VM.
    download                Download boot2docker ISO image.
    version                 Display version information.
...
```

Die Basis von *boot2docker* ist aktuell ein Kernel 3.14.1 mit AUFS und Docker 1.0.1. Es besteht die Möglichkeit, ein eigenes Images für die VirtualBox zu erstellen.

## Start des ersten Docker-Containers

In der VM oder auf der eigene Maschine können nun docker Container administriert, erzeugt, gestartet, gestoppt oder wieder gelöscht werden.

```bash
$ docker run ubuntu uname -a
Unable to find image 'ubuntu' locally
Pulling repository ubuntu
e54ca5efa2e9: Download complete
511136ea3c5a: Download complete
d7ac5e4f1812: Download complete
2f4b4d6a4a06: Download complete
83ff768040a0: Download complete
6c37f792ddac: Download complete
Linux 321d285612ef 3.14.1-tinycore64 #1 SMP Mon Jun 9 16:21:23 UTC 2014 x86_64 x86_64 x86_64 GNU/Linux
```

Das erzeugen eines eigenen Images kann mit einem Dockerfile definiert werden.

```bash
$ mkdir -p hello
$ cd hello
$ vi Dockerfile
```

**Dockerfile**

```text
FROM ubuntu

CMD ["echo", "Hello", " Docker"]
```

Mit dem Befehl `docker build` wird nun in der VM ein Images produziert und kann mit `docker run` gestartet werden.

```bash
$ docker build -t boot/hello .
Sending build context to Docker daemon  2.56 kB
Sending build context to Docker daemon
Step 0 : FROM ubuntu
 ---> e54ca5efa2e9
Step 1 : CMD ["echo", "Hello", "Docker"]
 ---> Running in 8dedcb96f9c0
 ---> 891601c49719
Removing intermediate container 8dedcb96f9c0
Successfully built 891601c49719
$ docker run boot/hello
Hello Docker
```

Nun ist die Basis für eigene Docker-Experimente gelegt. Die Integration in die eigenen Projekte, erweiterte Möglichkeiten für Tests oder ein vereinfachter Zugriff auf diverse Backends sind erste Kandidaten. Es gibt enorme Möglichkeiten und eine Suche im öffentlichen [Image-Register](https://registry.hub.docker.com/) lohnt sich.

--
Peter
