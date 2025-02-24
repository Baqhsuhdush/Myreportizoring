package kz.enu.restvt.restexample.entities;

public class Sport {

    public Sport(){

    }

    public Sport(String name, String description, String sport){
        this.name = name ;
        this.description = description;
    }

    private String name;
    private String description;

    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public String getDescription() {
        return description;
    }
    public void setDescription(String description) {
        this.description = description;
    }

}
