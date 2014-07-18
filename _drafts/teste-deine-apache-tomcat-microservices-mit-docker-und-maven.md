---
layout: post
title: "Teste Deine Apache Tomcat Microservices mit Docker und Maven"
modified: 2014-07-16 11:39:00 -0800
tags: [draft, tomcat, microservice, testing, maven, docker, rest, java ]
category: docker
links:
  - boot2docker: http://boot2docker.io/
  - jolokia-it: https://github.com/rhuss/jolokia-it
  - docker-maven-plugin: https://github.com/rhuss/docker-maven-plugin/
  - rest-assured: https://code.google.com/p/rest-assured/
  - boot2docker-fwd: https://gist.github.com/deinspanjer/9215467
  - simple management docker-maven-plugin: https://github.com/etux/docker-maven-plugin
  - ci with docker: http://www.wouterdanes.net/2014/04/11/continuous-integration-using-docker-maven-and-jenkins.html
keywords:
  - testing
  - apache tomcat
  - docker
  - jolokia
  - microservice
  - maven
  - java

---

Microservices wirklich selbst entwickeln stellt jeden vor neue Herausforderungen. Nicht nur das wir eine neue kleinere Aufteilung finden müssen, sondern auch das wir die einzelnen Teile fertiger für die Produktion liefern müssen. Das eigene System, das heute in einem Projekt in einem Java-WAR's oder -EAR's geliefert wird, muss sinnvoll geteilt werden. Nicht mehr der Betrieb konfiguriert den JEE-Container und schliesst die Backends an, sondern alles geschieht schon in der Entwicklung. Ein Netz von kooperativen Services entsteht. Jeder Prozess kooperiert mit einer Service Discovery und muss Autoscaling durch entsprechende Loadbalancer und Proxy bereitstellen. Der Microservice Architektur Trend fordert, dass wir in kleineren abgeschlosseneren, kooperativen Containern unsere Anwendungen liefern soll. Alles muss automatisiert, vermessbar und überprüfbar sein. Horror oder Segen liegen da oft nicht weit auseinander. Wenn die Probleme sich türmen ist es ein guter Rat mit weniger Teilen zu beginnen und diese wirklich zu verstehen. In diesem Post wollen wir deshalb einen Rest-Service auf der Basis von Apache Tomcat erstellen und in einem Docker-Container zum laufen bringen.

## Harmonien mit Docker aufspielen

Damit ein Microservice wirklich durchgängig von der Entwicklung in die Produktion geliefert werden können, muss die Umgebung harmonisiert werden. Exakt gleich ist dabei nicht immer möglich, ähnlich genug reicht oft. [Docker](http://www.docker.io) verspricht hier eine gute Lösung zu sein. Statt alle Systembestandteile in einzelne virtuelle Maschine zu verpacken, werden die Prozesse innerhalb leichtgewichtiger Linux Container gestartet. Die Container selbst werden als aufeinander aufbauende Images, mithilfe eines Image-Repositories verwaltet. Also nicht nur die eigenen Teile, sondern das Betriebssystem und alle Backends werden ebenfalls in solche Images verpackt. Möglich wird dies durch den Einsatz eines *layered Filesystems*, sprich [AUFS](http://aufs.sourceforge.net/). Die Brücke zwischen Entwicklung und Betrieb ist mit Docker also eine Harmonie. Das Docker-Orchester spielt einfach gut zusammen! Alles ist ein Container und kann auf dem lokalem Notebook, den Staging Umgebung, der eigenen Produktion, bei einem Provider oder in der Cloud betrieben werden und zwar mit den selben Binaries! Nur die Konfigurationen unterscheiden sich und das macht Sinn. Die Noten und Instrumente sind die selben, nur den guten Ton muss man noch selber treffen. Verflixt nicht einfach!

### Installation von Docker für die Java Webentwicklung

In den letzten Monaten, gibt es eine Flut von Projekten, die uns eine Unterstützung in der Entwicklung mit Docker offerieren. Da ist die Wahl nicht einfach und eine Konsolidierung ist noch fern. Der Start beginnt meist auf dem eigenen Notebook in einer *guten alten virtuellen Linux Maschine*. Sehr hilfreich für diese Installation ist das Projekt [boot2docker](http://boot2docker.io/). Eine Installation ist die Voraussetzung für die Entwicklung diese kleinen Micorservices. Die Installation kann detailiert in unserem Blog Post [boot2docker Post]({% post_url 2014-06-30-docker-mit-boot2docker-starten %}) nachgelesen werden.

Folgenden grobe Schritte müssen durchgeführt werden:

  - Installation von VirtuelBox >4.3.12
  - Installation des boot2docker Package für Windows oder OSX
  - Initialisierung der VM mit dem Befehl `boot2docker init`
  - Exportieren des neuen Docker Host `export DOCKER_HOST=http://<ip>:2375`
  - Starten der VM mit dem `boot2docker init` und `boot2docker up`
  - und los geht es mit dem Laden, ausführenen und Verbinden der Container.


## Erzeugen eines ersten Java Microservices

In diesem Post geht es darum einen trivialen Webservice zu bauen, der uns die Monitoring Information einer Java virtuellen Machine besorgt. Egal welche Art von Microservice man bereitstellen möchte, die Prozesse brauchen eine klare Schnittstelle für Metrik-, Log- und Health-Informationen. Moment, das brauchen wir doch gar nicht mehr alles selber bauen, den schon länger gibt es das Projekt [Jolokia](http://jolokia.org), das uns ermöglich sämtliche JMX-Daten und -Operationen als REST-Service anzubieten. Netterweise hat [Roland Huß](https://github.com/rhuss) nun im April 2014 auch ein Docker Maven Plugin für die Integrations Tests des Jolokia Projekts bereitgestellt. Hah! Also frisch ans Werk, um zu probieren, ob wir diesem Instrument ein paar harmonische Töne zu entlocken sind.

### Hello World auf Java *Restisch*!

Die Konstruktion eines *Hello World* Java-Rest Service ist immer mit etwas Aufwand verbunden. Damit wird etwas Luxus in der Entwicklung haben, bauen wir den Service mit Jersey und bauen die Artifakte mit maven.


  - boot eines kleinen maven Projekts
  - Jersey based Rest Service.
  - Metriken via Zähler MBean bereitstellen
  - Einfach Metrics Einbinden und die Daten via JMX anbieten.
  - Keine Reporter

```bash
$ mkdir -p tomcat-microservice-demo/src/main/java/com/bee42
$ cd tomcat-microservice-demo
$ vi pom.xml
```

**pom.xml**
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.bee42</groupId>
  <artifactId>tomcat-microservice-demo</artifactId>
  <version>0.1.0-SNAPSHOT</version>

  <url>http://www.bee42.com</url>

  <properties>
    <tomcat>8.0</tomcat>
    <image>jolokia/tomcat-${tomcat}</image>
    <jolokia.version>1.2.1</jolokia.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.jolokia</groupId>
        <artifactId>jolokia-war</artifactId>
      <version>${jolokia.version}</version>
      <type>war</type>
    </dependency>
    <dependency>
      <groupId>org.jolokia</groupId>
        <artifactId>jolokia-it-war</artifactId>
        <version>${jolokia.version}</version>
        <type>war</type>
    </dependency>

    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.11</version>
    </dependency>

    <dependency>
      <groupId>com.jayway.restassured</groupId>
      <artifactId>rest-assured</artifactId>
      <version>2.3.2</version>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.jolokia</groupId>
        <artifactId>docker-maven-plugin</artifactId>
        <version>${project.version}</version>
        <configuration>
          <image>${image}</image>
          <ports>
            <port>jolokia.port:8080</port>
          </ports>
          <waitHttp>http://localhost:${jolokia.port}/jolokia</waitHttp>
          <wait>10000</wait>
          <assemblyDescriptor>src/main/docker-assembly.xml</assemblyDescriptor>
        </configuration>
        <executions>
            <execution>
              <id>start</id>
              <phase>pre-integration-test</phase>
              <goals>
                <goal>start</goal>
              </goals>
            </execution>
            <execution>
              <id>stop</id>
              <phase>post-integration-test</phase>
              <goals>
                <goal>stop</goal>
              </goals>
            </execution>
        </executions>
      </plugin>

      <plugin>
        <artifactId>maven-failsafe-plugin</artifactId>
        <version>2.17</version>
        <executions>
          <execution>
            <id>integration-test</id>
            <goals>
              <goal>integration-test</goal>
            </goals>
          </execution>
          <execution>
            <id>verify</id>
            <goals>
              <goal>verify</goal>
            </goals>
          </execution>
        </executions>
        <configuration>
          <systemPropertyVariables>
            <jolokia.port>${jolokia.port}</jolokia.port>
            <jolokia.url>http://localhost:${jolokia.port}/jolokia</jolokia.url>
            <jolokia.version>${jolokia.version}</jolokia.version>
          </systemPropertyVariables>
        </configuration>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>2.10</version>
        <configuration>
          <skip>true</skip>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

Hello World Rest Service
**srv/main/java/com/bee42/examples/tomcat-microservice-demo**
```java
```


# Open port at your local machine
# install boot2dockerfwd at your local machine

```bash
$ mvn package
$ boot2dockerfwd
$ mvn test
```

Beispiel finde Ihr unter:

git clone https://prossbach.github.com/docker-tomcat-hello

Tipp mit boot2docker-fwd! sonst kann der Service von den Tests nicht angesprochen werden.

## Vorstellen des Orchester


  - Kontakt mit den Containern
  - Schichtung
     Bild layered system

  - Kooperierende Data Container, statt Layer
      Warum ist das nett.

  - Unabhängige Verwendung von War's für verschiedene Web JEE Container.
  - Austausch der Versione ohne Änderungen

Bilder

export der Container und freigabe in einem Repository ermöglichen nun den einsatz.
Die Trennung des War und WebContainer ist geschickt für den Test oder die INtegraton in verschiedenen Umgebungen. Hier sieht man aber schnell das Docker das Pods-Konzept von Kubernetes braucht, damit ein Deployment vieler Container die zusammenspielen sollen braucht.

## Fazit

Die Umstellung für die Entwicklung ist einfach.
Verschiedene Versionn bereitstellen
Unabhängigkeit zwischen WAR Version und dem Tomcat waren.
  Ob das wirklich gut ist?

Die eigene Tomcat Version bestimmen
  Wie!

Was geht noch nicht!
  - Bau eines Docker Images veröffentlichung in einer eigenen Registiery
    Noch Manuell oder mit einem anderen Maven Plugin!

Im nächsten Post muss nun ein Backend an den Service gebunden werden.


Hinweis auf den Talk auf der WJAX Roland Huss und mein Java Microservicetalk


WJAX 2014 in München
[Roland Huß. Docker Maven Plugin](http://jax.de/wjax2014/sessions/XXXX)

[Tomcat als Basis Deiner Microservice- Anwendung](http://jax.de/wjax2014/sessions/tomcat-als-basis-deiner-micro-services-anwendungen)

Docker Workshop oder die Dev Ops Days.


## Zeuges das gefiltert werden muss
plot
  - setup boot2docker
  - restservice mit json - hello world
  - lokaler war file
  - integrationstest
  - pom
  - assembly
  - setup mit docker nah an der Zielumgebung unix
  - test
    - elgant mit bdd und junit 4
    - rest acces lib
  - los geht es mit mehr.
  - schnittstelle zu jolokia
  - zeigen wie der service sich selbst darstellt.
    - self monitoring mit d3 charts?
  - was ist entstanden
    - layer in docker
      - OS
      - java
      - tomcat + apps
    - Diagram mit port mapping  
    - Resultat kann einfach commit werden und überall laufen.
      - check erzeugen des images
      - Tipp locales repo
  - wer mehr brauch kann sich in seine boot2docker Instanz dokku installieren.
    - dann ist eine service integration sehr einfach.
    - Link your backends
    - env trick im tomcat

setup tiny restservice
  - integration von Monitoring
  - einfacher hello world rest service
  - prod erzeugen war und installiere lokal

Vorteile
  - Die Tests erfolgen in der Zielumgebung
  - Test können auf
  - Maven Integration
  - Testen auf beliebigen Docker Container
  - Testen verschiedener
  - Zeigt wie einfach Monitoring eines Microservices integrierbar ist.
  - Testen von REST API mit hilfe von Arrured BDT

Nachteile
  - Zu starten muss erstmal alles installiert werden - Wait > 5 Minuten 1 GB... downloads
  - `[INFO] Total time: 29:15 min`
  - Das Management zu exakten Versionen vom Tomcat fehlt.
  - Das einfrienen eines exaken Versionsstand ist schwierig, wenn externe Projekte die Versionen verändern.
  - Nachvollziehbarkeit schwach
  - Setup weiteren Container und links - Backends wie redis, mongodb, mysql, zeromq, rest services.

- Print this articel with chrome pdf plugin!

Was ist geschafft: Einfaches testen von Microservices.
Die Umgebung ist nah

Was bringst?


- Maven Plugin
Beispiel



```bash
mvn verify
```

Nun ist Geduld erforderlich den in der frischen Docker Installation müssen die Basis Images für das Betriebssystem, Java, und Apache Tomcat geladen werden. Je nach Internet Zugang dauert das ein paar Minuten.

**Don't, do it on train or with slow mobile connects.**


öffenen des container für die testports.

```bash
[boot2docker] $ ./boot2docker-fwd -l
NIC 1 Rule(0):   name = docker, protocol = tcp, host ip = 127.0.0.1, host port = 2375, guest ip = , guest port = 2375
NIC 1 Rule(1):   name = ssh, protocol = tcp, host ip = 127.0.0.1, host port = 2022, guest ip = , guest port = 22
[boot2docker] $ ./boot2docker-fwd -A
Creating 1802 port forwarding rules.  Please wait...
[boot2docker] $ ./boot2docker-fwd -l
NIC 1 Rule(0):   name = docker, protocol = tcp, host ip = 127.0.0.1, host port = 2375, guest ip = , guest port = 2375
NIC 1 Rule(1):   name = ssh, protocol = tcp, host ip = 127.0.0.1, host port = 2022, guest ip = , guest port = 22
NIC 1 Rule(2):   name = tcp-port49000, protocol = tcp, host ip = , host port = 49000, guest ip = , guest port = 49000
NIC 1 Rule(3):   name = tcp-port49001, protocol = tcp, host ip = , host port = 4
# delete all rules
[boot2docker] $ ./boot2docker-fwd -D

```

```bash
 ./bin/boot2docker-fwd -n tomcat.port.45000 -h 45000 45000
 mvn -Dtomcat.port=45000 verify
 ./bin/boot2docker-fwd -d tomcat.port.45000
```

check docker
verbraucher platz 1.3 GB - Sehr ordentlicher verbraucht für den test eine Tomcat anwendung.... Nun haben wir aber einen Container für
den Test all unser Anwendungen... Hmm, und die sind auch noch getrennt.

```bash
[~] $ boot2docker ssh
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

docker@boot2docker:~$ df
Filesystem                Size      Used Available Use% Mounted on
rootfs                  900.3M    204.8M    695.5M  23% /
tmpfs                   900.3M    204.8M    695.5M  23% /
tmpfs                   500.2M         0    500.2M   0% /dev/shm
/dev/sda1                18.2G      1.1G     16.1G   7% /mnt/sda1
cgroup                  500.2M         0    500.2M   0% /sys/fs/cgroup
/dev/sda1                18.2G      1.1G     16.1G   7% /mnt/sda1/var/lib/docker/aufs
```


## Fragen
  - Wohin mit den Metriken?
    - dockerrana
  - wohin mit den Logfiles
    - logstash und Co
  - Sollten die Logdateien vielleicht lieber über ein Volumen des Host geshard werden?
    - Konvention der Verzeichnis bäume.
