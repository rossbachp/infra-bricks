---
layout: post
title: "Server spezifizieren und testen - mit serverspec"
modified: 2014-04-25 14:46:50 +0200
tags: [serverspec,code]
category: tech
image:
  feature: 
  credit: 
  creditlink: 
comments: 
share: 
---

In der Softwareentwicklung sind Spezifikation und Testen fester Bestandteil des Arbeitsweise. Unit-Testing und 
Test Driven Development haben in der modernen Entwicklung ihren festen Platz, ob agil oder nicht. Bei der
Bereitstellung von IT Infrastruktur, also Netzwerk, Storage und Compute sieht es dagegen noch eher klassisch
aus: Appliances und Server werden aufgebaut und übergeben, und wenn technische Einzelheiten nicht funktionieren,
wird nachgearbeitet.

Bei der Bereitstellung von virtuellen Maschinen sieht es schon etwas besser aus. Hier haben Elemente aus der
Test Driven Infrastruktur Einzug gehalten. VMs entstammen entweder einem Image oder einer strukturierten Installation (z.B. Kickstart),
 und sie erhalten ihre Konfiguration über entsprechende Werkzeuge wie Salt, Ansible oder Puppet.

Aber auch diese Werkzeuge benötigen ihre Konfigurationen, die - je nach Werkzeug - eher gecoded als "spezfiziert" aussehen.
Puppet als Beispiel bietet eine deklarative DSL, aber eine größere Puppetinstallation inkl. PuppetDB und/oder Hiera, Module und
deren Abhängigkeiten besitzt eine eigene Komplexität. Die will durch erfahrene Infra-Coder gemanaged werden.

## Wie soll das Endergebnis aussehen?

An welcher Stelle in der Bereitstellungskette wird eigentlich genau beschrieben, "wie" das Endergebnis aussehen soll? Und womit?

Ruby-Entwickler kennen mit rspec, cucumber und gherkin Möglichkeiten, (Code-)Funktionalität zu spezifizieren. Die sieht dann - je
nach verwendetem Framework - auch natürlich-sprachlich aus. Dasselbe gibt es nun auch für IT-Infrastruktur, im speziellen: Servern.

## serverspec

Serverspec (www.serverspec.org) ist ein Werkzeug, um RSpec-Testfälle für Server formulieren und ausführen zu können. Dabei wird
das Endergebnis spezifiziert und getestet. D.h. es ist egal, mit welchem Konfigurationsmanagementtool ein Server aufgesetzt wurde oder
ob er sogar manuell installiert wurde, serverspec testet allein den aktuellen Zustand.



 
