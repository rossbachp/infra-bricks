---
layout: post
title: "Docker Microservice Basis mit Apache Tomcat implementieren"
modified: 2014-12-17 16:30:00 +0100
tags: [draft, docker, apache tomcat, microservice, java]
category: docker
links:
  - Beispiel: https://github.com/infrabricks/docker-simple-tomcat8
  - Andere Version eines flexiblen Tomcat Image: https://github.com/rossbachp/dockerbox/tree/master/docker-images/tomcat8
  - Docker: https://docker.com
  - The Apache Tomcat: https://tomcat.apache.org
  - The Twelve Factor App: http://12factor.net/
  - Introduction microservices: http://www.infoq.com/articles/microservices-intro
  - Docker with Tomcat: http://elsoufy.blogspot.de/2014/04/automating-docker-image-builds-with.html
keywords:
  - docker
  - apache tomcat
  - java
  - microservice
  - 12factor
---

## Mit Docker Java Microservices realisieren - SETUP

Das Docker-Ökosystem ist die ideale Umgebung um Microservice zu implementieren. Die Ideen ist verschiedene Services auf einen Rechner isoliert voneinander bereitzustellen. Ähnlichkeiten zu der heute verbreiteten Virtualisierung exitieren, aber ohne die Anhängigkeiten
zu einem bestimmten Hersteller oder dem Overhead der Ablaufplattform. Die Docker-Container nutzen einfach den Linux-Kernel und können in verschiedenen Umgebungen anpassbar betrieben werden. Die Leichtigkeit beruht auf den schon lange vorhandenen Linux API's, wie Namespaces, CGroups, Capabilities oder SELinux. Docker fügt neben einem Rest-Service noch die Definition einen austauschbaren Image-Format hinzu. Teilen von vorgefertigter Software ist nun also mit Docker wirklich Realität. Docker basiert auf durch die OpenSource Community definierten Schnittstellen und besitzt Plugins die Raum für eigene Erweiterungen bieten. Das bringt jeden Entwickler und Administrator schnell zum schwärmen. Es befeuert die Idee eine kontrollierte Umgebung von der Entwicklung bis in die Produktion zu nutzen. Micorservices lassen sich so einfacher realisieren und orchestrieren.

Die Begriffe [Microservice](http://martinfowler.com/articles/microservices.html), Continuous Delivery-Pipeline und Docker berauscht also gerade die IT. Alles in kleine Funktionseinheiten spalten, wird als Heilmittel für die Ablösung der kostenträchtigen aktuellen IT gepriesen. Wir wollen schneller, zuverlässiger und  preiswerter liefern und damit den Wunsch, nach unkompilizieren Änderungen, endlich befriedigen. Schöne neue Welt, aber Hand auf Herz, die IT-Welt ist komplex und die bestehenden Systeme beherrschen unsere tägliches Handeln mehr als uns lieb ist. Wer das Glück hat in seinem Projekt schon jetzt einen Blick in die IT-Zukunft wagen zu können, der kann allerdings nun aus dem vollen Schöpfen. Das Docker-Ökosystem bietet jede Menge neuer exotischer Verführungen.


**Also ran ans Werk!**

## Bereitstellen von Java- und Apache Tomcat Docker-Images

Aufsetzen einer Entwicklungsumgebung für Java mit Apache Tomcat kann von vielen Tücken begleitet werden. Schnell kommt das Setup einer DB und weitere Backends hinzu. Das Aufsetzen einer einheitlichen Umgebung im Team und die Integration neuer Mitglieder ist leider oft eine zeitaufwendige Geschichte. Schnelle Auslieferung bedeutet auch schnelle Handlungen im Code, Team, in der Entwicklungsumgebung und der Produktion. Hier hift nur die Automatisierung und Standartisierung voranzutreiben. Docker kann hier helfen, die Infrastruktur mehr als Code zu begreifen. Viele vorgefertigte Images stehen auf dem Docker-Hub schon bereit. Ein Testsetup einer Komponente kann also schnell erfolgen. Eine Herausforderung bleibt es allerdings, den eigenen individuellen Code schnell mit den bereitgestellten Services zu verheiraten oder ein eignes Services-Images zu realisieren.

### Das Experiment: Ein Java-Image für Dev und Ops bereitstellen

Auf dem Docker-Hub existieren natürlich viele Java-Images. Allerdings basieren sie oft auf dem _falschem_ Betriebssystem, enthalten nicht die richtige Java Version oder sie sind schlicht zu gross.

Im folgenden entsteht die Basis ein eigenes Java-Images zu erzeugen.

 * Mit minimaler Grösse, damit ein schneller Download möglich ist.
 * Für den Apache Tomcat 8 reicht ein Java-Runtime.
 * Java Anwendungen und Werkzeuge sollen nutzbar sein.

Als _minimales_ Betriebssystem ohne Alles reicht für Java die Distribution [Busybox](https://github.com/progrium/busybox) völlig aus. Mit Hilfe von `curl` ist so schnell ein Oracle JRE-Tarball extrahiert und bereitgestellt.

**jre8/Dockerfile**
```
# Busybox with a Java installation
FROM progrium/busybox
MAINTAINER Peter Rossbach <peter.rossbach@bee42.com>

# Install cURL
RUN opkg-install curl

# Java Version
ENV JAVA_VERSION_MAJOR 8
ENV JAVA_VERSION_MINOR 25
ENV JAVA_VERSION_BUILD 17
ENV JAVA_PACKAGE       server-jre
ENV JAVA_CHECKSUM      c3ec171fac394c584a0a5cecb1731efd

# Download, verify and extract Java
RUN curl -kLOH "Cookie: gpw_e24=http%3A%2F%2Fwww.oracle.com%2F; oraclelicense=accept-securebackup-cookie" \
http://download.oracle.com/otn-pub/java/jdk/${JAVA_VERSION_MAJOR}u${JAVA_VERSION_MINOR}-b${JAVA_VERSION_BUILD}/${JAVA_PACKAGE}-${JAVA_VERSION_MAJOR}u${JAVA_VERSION_MINOR}-linux-x64.tar.gz \
  && echo "${JAVA_CHECKSUM}  ${JAVA_PACKAGE}-${JAVA_VERSION_MAJOR}u${JAVA_VERSION_MINOR}-linux-x64.tar.gz" > ${JAVA_PACKAGE}-${JAVA_VERSION_MAJOR}u${JAVA_VERSION_MINOR}-linux-x64.tar.gz.md5.txt \
  && md5sum -c ${JAVA_PACKAGE}-${JAVA_VERSION_MAJOR}u${JAVA_VERSION_MINOR}-linux-x64.tar.gz.md5.txt \
  && gunzip ${JAVA_PACKAGE}-${JAVA_VERSION_MAJOR}u${JAVA_VERSION_MINOR}-linux-x64.tar.gz \
  && tar -xf ${JAVA_PACKAGE}-${JAVA_VERSION_MAJOR}u${JAVA_VERSION_MINOR}-linux-x64.tar -C /opt \
  && rm ${JAVA_PACKAGE}-${JAVA_VERSION_MAJOR}u${JAVA_VERSION_MINOR}-linux-x64.tar* \
  && ln -s /opt/jdk1.${JAVA_VERSION_MAJOR}.0_${JAVA_VERSION_MINOR} /opt/jdk

# Set environment
ENV JAVA_HOME /opt/jdk
ENV PATH ${PATH}:${JAVA_HOME}/bin

VOLUME [ "/opt/jdk"]

ENTRYPOINT ["java"]
CMD ["-version"]
```

Nicht vergessen bei Download von fremden Quellen die Prüfsumme zu überprüfen. Mit diesem `jre8/Dockerfile` lässt sich nun der Java-Container schnell erzeugen und testen:

```bash
$ mkdir -p jre8
$ vi jre8/Dockerfile
...
$ docker build -t infrabricks/ex-java:jre-8 jre8
$ docker run --rm infrabricks/ex-java:jre-8
java version "1.8.0_25"
Java(TM) SE Runtime Environment (build 1.8.0_25-b17)
Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)
$ docker images |grep "infrabricks/java"
infrabricks/java                                          jre-8                    96860db18ac9        8 seconds ago       160.3 MB
```

**Voila!**

#### JDK gefällig

Wenn ein Java Development-Kit gewünscht wird, kann dies analog erstellt werden.

Dazu müssen im Dockerfile folgenden Veränderung erfolgen:

**jdk8/Dockerfile**
```
...
ENV JAVA_PACKAGE       jdk
ENV JAVA_CHECKSUM      e145c03a7edc845215092786bcfba77e
...
```

Das Erzeugen des Images und der Test geschieht analog.

```bash
$ mkdir -p jdk8
$ vi jkd8/Dockerfile
...
$ docker build -t infrabricks/ex-java:jdk-8 jdk8
$ docker run --rm infrabricks/ex-java:jdk-8
java version "1.8.0_25"
Java(TM) SE Runtime Environment (build 1.8.0_25-b17)
Java HotSpot(TM) 64-Bit Server VM (build 25.25-b02, mixed mode)
$ docker run --rm --entrypoint=/bin/sh -ti -v `pwd`:/data infrabricks/java:jdk-8
$ ls /opt/jdk/bin
ControlPanel    jarsigner       javafxpackager  jcmd            jhat            jmc.ini         jstat           orbd            rmiregistry     unpack200
appletviewer    java            javah           jconsole        jinfo           jps             jstatd          pack200         schemagen       wsgen
extcheck        java-rmi.cgi    javap           jcontrol        jjs             jrunscript      jvisualvm       policytool      serialver       wsimport
idlj            javac           javapackager    jdb             jmap            jsadebugd       keytool         rmic            servertool      xjc
jar             javadoc         javaws          jdeps           jmc             jstack          native2ascii    rmid            tnameserv
$ du -s /opt/jdk1.8.0_25
322308	/opt/jdk1.8.0_25
$ exit
$ docker images |grep "infrabricks/java"
infrabricks/java                                          jre-8                    96860db18ac9        22 minutes ago      160.3 MB
infrabricks/java                                           jdk-8                    fbf0c4b72d14        8 seconds ago      331.3 MB
```

In der Auflistung wird deutlich, welche grossen Mengen an Plattenplatz die visuellen Tools, libs, Quelle und Dokumentation eines JDK's benötigen! In der Produktion sollte dieser Overhead nur selten notwendig sein, oder?

#### Apache Tomcat Image - Ontop

Auf der Basis des Java-Images kann nun die Bereitstellung des Tomcats erfolgen:

**tomcat8/Dockerfile**
```
FROM infrabricks/ex-java:jre-8
MAINTAINER Peter Rossbach <peter.rossbach@bee42.com>

ENV TOMCAT_MINOR_VERSION 8.0.15
ENV CATALINA_HOME /opt/tomcat

RUN curl -O http://archive.apache.org/dist/tomcat/tomcat-8/v${TOMCAT_MINOR_VERSION}/bin/apache-tomcat-${TOMCAT_MINOR_VERSION}.tar.gz && \
 curl http://archive.apache.org/dist/tomcat/tomcat-8/v${TOMCAT_MINOR_VERSION}/bin/apache-tomcat-${TOMCAT_MINOR_VERSION}.tar.gz.md5 | md5sum -c - && \
 gunzip apache-tomcat-*.tar.gz && \
 tar xf apache-tomcat-*.tar && \
 rm apache-tomcat-*.tar && mv apache-tomcat* ${CATALINA_HOME} && \
 rm -rf ${CATALINA_HOME}/webapps/examples \
  ${CATALINA_HOME}/webapps/docs ${CATALINA_HOME}/webapps/ROOT \
  ${CATALINA_HOME}/webapps/host-manager \
  ${CATALINA_HOME}/RELEASE-NOTES ${CATALINA_HOME}/RUNNING.txt \
  ${CATALINA_HOME}/bin/*.bat ${CATALINA_HOME}/bin/*.tar.gz

WORKDIR /opt/tomcat
EXPOSE 8080
EXPOSE 8009
VOLUME [ "/opt/tomcat" ]

ENTRYPOINT [ "/opt/tomcat/bin/catalina.sh" ]
CMD [ "run"]
```

Die Standard-Distribution des Tomcats wird gesäubert. Dann werden die entsprechenden Ports preisgegeben und der Startbefehl für den Tomcat gesetzt.

```bash
$ mkdir -p tomcat8
$ vi tomcat8/Dockerfile
...
$ docker build -t infrabricks/ex-tomcat:8 tomcat8
$ docker run --rm --entrypoint=/opt/tomcat/bin/version.sh infrabricks/ex-tomcat:8
```

#### Die erste Anwendung - Hello Status

Die folgenden Status-Anwendung kann nun implementiert und eingebunden werden.

**index.jsp**
```jsp
<%@ page session="false" %>
<%
java.text.DateFormat dateFormat =
new java.text.SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
%>
<html>
<body>
<h1>Docker Tomcat Status page</h1>

<ul>
<li>Hostname : <%= java.net.InetAddress.getLocalHost().getHostName() %></li>
<li>Tomcat Version : <%= application.getServerInfo() %></li>
<li>Servlet Specification Version : <%= application.getMajorVersion() %>.<%= application.getMinorVersion() %></li>
<li>JSP version : <%=JspFactory.getDefaultFactory().getEngineInfo().getSpecificationVersion() %></li>
<li>Now : <%= dateFormat.format(new java.util.Date()) %></li>
</ul>
</body>
</html>
```  

Die einfach Anwendung kann nun mittels `zip` zu einem WAR-File verpackt werden und gegebenfalls als Volume eingebunden werden.

```bash
$ mkdir -p status/webapp
$ cd status/webapps
$ vi index.jsp
...
$ zip -r ../status.war .
$ cd ../..
$ CID=$(docker run -d -v `pwd`/status/webapp:/opt/tomcat/webapps/status) infrabricks/ex-tomcat:8
$ docker logs $CID
```

Ausführen kann man die Anwendung mittels `curl`. Wenn ein Browser gewünscht ist, muss der Tomcat-Ports mit der Option `-p 8080:8080` von aus erreichbar gemacht werden.

```bash
$ IP=$(docker inspect --format '{{ .NetworkSettings.IPAddress }}' ${CID})
$ curl -s http://$IP:8080/status/index.jsp


<html>
<body>
<h1>Docker Tomcat Status page</h1>

<ul>
<li>Hostname : a222c4e3f231</li>
<li>Tomcat Version : Apache Tomcat/8.0.15</li>
<li>Servlet Specification Version : 3.1</li>
<li>JSP version : 2.3</li>
<li>Now : 2014/12/17 16:06:32</li>
</ul>
</body>
</html>
```

#### Nutzung der Tomcat Manager Webapp

Der Zugriff auf die Manager Anwendung des Tomcats kann nur mit entsprechender
Autorisierung erfolgen. Die Konfiguration erfolgt hier durch die folgenden Datei:

**tomcat8/conf/tomcat-users.xml**
```xml
<?xml version='1.0' encoding='utf-8'?>
<tomcat-users xmlns="http://tomcat.apache.org/xml"
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xsi:schemaLocation="http://tomcat.apache.org/xml tomcat-users.xsd"
version="1.0">

  <role rolename="manager-script"/>
  <user username="manager" password="tomcat" roles="manager-script"/>
</tomcat-users>
```

Die Anbindung ist etwas aufwendiger da nur Verzeichnisse in einen Container eingebunden werden können. Es wird also ein Startskripte benötigt, das vor dem Start des Containers die Datei verlinkt oder kopiert.

**tomcat8/bin/tomcat.sh**
```bash
#!/bin/sh
ln -s /opt/bootstrap/conf/tomcat-users.xml /opt/tomcat8/conf/tomcat-users.xml
${CATALINA_HOME}/bin/catalina.sh run
```

Die Integration in die Tomcat geschieht durch die Anbindung eines Volumes.

```bash
$ mkdir -p tomcat8/bin
$ vi tomcat8/bin/tomcat.sh
...
$ chmod -x tomcat8/bin/tomcat.sh
$ docker run -d \
 -v `pwd`/status/webapp:/opt/tomcat/webapps/status \
 -v `pwd`/tomcat8:/opt/bootstrap \
 --entrypoint=/opt/bootstrap/tomcat.sh \
 infrabricks/ex-tomcat:8
$ CID=$(docker ps -lq)
$ IP=$(docker inspect --format '{{ .NetworkSettings.IPAddress }}' ${CID})
$ curl -u manager:tomcat http://$IP:8080/manager/text/list
```

Natürlichen lassen sich ähnlich Tomcat-Erweiterungen ins Verzeichnis `/opt/bootstrap/lib` einbinden oder andere Konfigurationen austauschen. Im Git Projekt [infrabricks docker-simple-tomcat8](https://github.com/infrabricks/docker-simple-tomcat8)  ist ein erweitertes Skript zu finden. Ein weiteres Projekt einer echte Infrabricks Tomcat Line entsteht gerade. Dort entsteht eine ganzen Tomcat-Familie, die auf verschiedenen Java- und Tomcat-Versionen besteht.

### Tricks

#### Docker Container Composition

Wenn die JDK-Tools in einem Tomcat benötigt werden, lassen sich
diese einfach von JDK-Image übernehmen. Das geht problemlos, auch ohne das der Tomcat von diesem Images abgeleitet werden muss.

```bash
$ docker run --name jdk8 infrabricks/ex-java:jdk-8
$ docker run -d \
 --volumes-from jdk8 \
 -v `pwd`/status/webapp:/opt/tomcat/webapps/status \
 infrabricks/ex-tomcat:8
$ CID=$(docker ps -lq)
$ docker exec $CID jstat -gc 1 5000  
$ docker exec -ti $CID /bin/sh
...
```

Das JDK-Image exportiert mit der Angabe `VOLUME [ "/opt/jdk" ]` die Java-Installation. Mit der Angabe von `--volumes-from` lässt sich einfach die vorhandene JRE-Installation überblenden. Layered Filesysteme sind schon ein Segen für die Entwicklung von Infrastruktur.

**Happy debugging!!**

#### Tomcat als Data-Container nutzen

Wenn man die vollständige Freiheit über die Wahl der Java-Distribution haben möchte, kann man als Alternative den Tomcat als Data-Container liefern. Auf der Basis von `progrium/busybox` lässt sich das schnell erzeugen und die Installation als Volume freigeben.

Mit folgenden Änderungen auf dem bestehenden `tomcat8/Dockerfile` entsteht eine
Tomcat Data-Container.

**tomcat8-volume/Dockerfile**
```
# Busybox with a Java installation
FROM progrium/busybox
MAINTAINER Peter Rossbach <peter.rossbach@bee42.com>
...
VOLUME [ "/opt/tomcat" ]
ENTRYPOINT [ "/bin/true" ]
```

Start des Data Containers Tomcats auf der Basis des JDK's:

```bash
$ docker build -t infrabricks/ex-tomcat:8-volume tomcat8-volume
$ docker run --name tomcat8 infrabricks/ex-tomcat:8-volume
$ docker run -d -p 8080:8080 \
 --volumes-from tomcat8 \
 -v `pwd`/status/webapp:/opt/tomcat/webapps/status \
 --entrypoint /opt/tomcat/bin/catalina.sh \
 infrabricks/ex-java:jdk-8 run
```

Mit diesem Muster lassen sich nun sehr effizient und schnell verschiedene Java-Versionen mit einer Anwendung testen. Natürlich spricht auch nichts dagegen, einfach einen Apache Tomcat lokal auszupacken und diesen direkt als Volume zu nutzen.

## Fazit

Mit dieser Basis kann nun der Start für die eigenen Webapps oder REST-Microservices gewagt werden. In einer der nächsten Post wird ein entsprechendes REST-Beispiel vorgestellt und im folgenden schrittweise zu einer eigenen Microservice-Plattform weiterentwickelt.

  * Java-Installationen für die Produktion sollten auf einem minimalen Base-Image beruhen.
  * Alle Downloads sollten mit Checksum validiert werden.
  * Das vorgestellte Tomcat Basis-Image lässt sich sehr einfach mit eigenen Konfigurationen, Anwendungen und Libs erweitern.
  * Die Komposition von verschiedenen Container macht den Test und die Entwicklung einfacher.
  * **WARNUNG**: Um die visuellen Java-Tools zu nutzen, kann es sein, dass eine Debian Base Images mit entsprechenden X-Libs benötigt wird.

In diesem Sinne, viel Spaß beim probieren oder selber gestalten.

---
Peter
