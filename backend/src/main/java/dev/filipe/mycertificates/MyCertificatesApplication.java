package dev.filipe.mycertificates;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MyCertificatesApplication {

	public static void main(String[] args) {
		SpringApplication.run(MyCertificatesApplication.class, args);
	}

}
