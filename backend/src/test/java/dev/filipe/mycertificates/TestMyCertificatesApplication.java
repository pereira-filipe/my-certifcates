package dev.filipe.mycertificates;

import org.springframework.boot.SpringApplication;

public class TestMyCertificatesApplication {

	public static void main(String[] args) {
		SpringApplication.from(MyCertificatesApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
